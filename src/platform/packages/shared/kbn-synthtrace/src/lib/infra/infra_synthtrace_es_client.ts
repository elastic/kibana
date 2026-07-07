/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  ESDocumentWithOperation,
  InfraDocument,
  SynthtraceGenerator,
} from '@kbn/synthtrace-client';
import type { Readable } from 'stream';
import { pipeline, Transform } from 'stream';
import type { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { SynthtraceEsClientBase } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import type { Logger } from '../utils/create_logger';
import type { PipelineOptions } from '../../cli/utils/clients_manager';
import type { PackageManagement } from '../shared/types';

export type InfraSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export interface InfraSynthtraceEsClient
  extends SynthtraceEsClient<InfraDocument>,
    PackageManagement {}

export class InfraSynthtraceEsClientImpl
  extends SynthtraceEsClientBase<InfraDocument>
  implements InfraSynthtraceEsClient
{
  constructor(
    options: {
      client: Client;
      logger: Logger;
      pipeline?: PipelineOptions;
    } & InfraSynthtraceEsClientOptions &
      PipelineOptions
  ) {
    super({
      ...options,
      pipeline: infraPipeline({
        includePipelineSerialization: options.includePipelineSerialization,
      }),
    });
    this.dataStreams = [
      'metrics-system*',
      'metrics-kubernetes*',
      'metrics-docker*',
      'metrics-aws*',
      'metrics-hostmetricsreceiver.otel*',
    ];
  }

  private otelTemplateCreated = false;

  override async index(
    streamOrGenerator:
      | (Readable | SynthtraceGenerator<InfraDocument>)
      | Array<Readable | SynthtraceGenerator<InfraDocument>>,
    pipelineCallback?: (base: Readable) => NodeJS.WritableStream
  ): Promise<void> {
    if (!this.otelTemplateCreated) {
      await this.ensureOtelDataStreamTemplate();
      this.otelTemplateCreated = true;
    }
    return super.index(streamOrGenerator, pipelineCallback);
  }

  private async ensureOtelDataStreamTemplate() {
    const templateName = 'metrics-hostmetricsreceiver.otel';
    try {
      await this.client.indices.putIndexTemplate({
        name: templateName,
        index_patterns: ['metrics-hostmetricsreceiver.otel-*'],
        data_stream: {},
        priority: 500,
        template: {
          mappings: {
            dynamic: true,
            dynamic_templates: [
              {
                strings_as_keyword: {
                  match_mapping_type: 'string',
                  mapping: { type: 'keyword', ignore_above: 1024 },
                },
              },
            ],
            properties: {
              '@timestamp': { type: 'date' },
              host: {
                properties: {
                  name: { type: 'keyword' },
                  hostname: { type: 'keyword' },
                  ip: { type: 'ip' },
                  os: { properties: { name: { type: 'keyword' } } },
                },
              },
              cloud: {
                properties: {
                  provider: { type: 'keyword' },
                  region: { type: 'keyword' },
                },
              },
              data_stream: {
                properties: {
                  dataset: { type: 'keyword' },
                  type: { type: 'keyword' },
                  namespace: { type: 'keyword' },
                },
              },
            },
          },
        },
      });
      this.logger.info(`Created index template "${templateName}"`);
    } catch (error) {
      this.logger.warning(`Failed to create index template "${templateName}": ${error}`);
    }
  }

  async initializePackage(opts?: { version?: string; skipInstallation?: boolean }) {
    if (!this.fleetClient) {
      throw new Error(
        'InfraSynthtraceEsClient requires a FleetClient to be initialized. Please provide a valid Kibana client.'
      );
    }

    const { version, skipInstallation = true } = opts ?? {};

    let latestVersion = version;
    if (!latestVersion || latestVersion === 'latest') {
      latestVersion = await this.fleetClient.fetchLatestPackageVersion('system');
    }

    if (!skipInstallation) {
      await this.fleetClient.installPackage('system', latestVersion);
    }

    return latestVersion;
  }
  async uninstallPackage() {
    if (!this.fleetClient) {
      throw new Error(
        'InfraSynthtraceEsClient requires a FleetClient to be initialized. Please provide a valid Kibana client.'
      );
    }
    await this.fleetClient.uninstallPackage('apm');
  }
}

function infraPipeline({ includePipelineSerialization = true }: PipelineOptions) {
  return (base: Readable) => {
    const serializationTransform = includePipelineSerialization ? [getSerializeTransform()] : [];

    return pipeline(
      base,
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      ...serializationTransform,
      getRoutingTransform(),
      getDedotTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<InfraDocument>, encoding, callback) {
      const dataset = document['data_stream.dataset'];
      if (typeof dataset === 'string' && dataset.includes('otel')) {
        document._index = `metrics-${dataset}-default`;
        callback(null, document);
        return;
      }

      const metricset = document['metricset.name'];

      if (metricset === 'cpu') {
        document._index = 'metrics-system.cpu-default';
      } else if (metricset === 'memory') {
        document._index = 'metrics-system.memory-default';
      } else if (metricset === 'network') {
        document._index = 'metrics-system.network-default';
      } else if (metricset === 'load') {
        document._index = 'metrics-system.load-default';
      } else if (metricset === 'filesystem') {
        document._index = 'metrics-system.filesystem-default';
      } else if (metricset === 'diskio') {
        document._index = 'metrics-system.diskio-default';
      } else if (metricset === 'core') {
        document._index = 'metrics-system.core-default';
      } else if ('container.id' in document) {
        document._index = 'metrics-docker.container-default';
        document._index = 'metrics-kubernetes.container-default';
      } else if ('kubernetes.pod.uid' in document) {
        document._index = 'metrics-kubernetes.pod-default';
      } else if ('aws.rds.db_instance.arn' in document) {
        document._index = 'metrics-aws.rds-default';
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
