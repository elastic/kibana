/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
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

export interface OtelDataStreamTemplateOptions {
  tsds?: boolean;
  lookBackTime?: string;
}

export interface InfraSynthtraceEsClient
  extends SynthtraceEsClient<InfraDocument>,
    PackageManagement {
  setOtelDataStreamTemplateOptions(options: OtelDataStreamTemplateOptions): void;
}

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
  // Default preserves the historical plain-data-stream template so existing
  // consumers (e.g. the `generateHostsSemconvData` performance journey) are
  // unaffected. Benchmark scenarios that need production-shaped TSDS indices
  // opt in explicitly via `setOtelDataStreamTemplateOptions({ tsds: true })`.
  private otelTemplateOptions: OtelDataStreamTemplateOptions = { tsds: false };

  setOtelDataStreamTemplateOptions(options: OtelDataStreamTemplateOptions): void {
    this.otelTemplateOptions = { ...this.otelTemplateOptions, ...options };
  }

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
    const { tsds = false, lookBackTime } = this.otelTemplateOptions;

    try {
      await this.client.indices.putIndexTemplate({
        name: templateName,
        index_patterns: ['metrics-hostmetricsreceiver.otel-*'],
        data_stream: {},
        priority: 500,
        template: tsds ? buildTsdsOtelTemplate(lookBackTime) : buildPlainOtelTemplate(),
      });
      this.logger.info(
        `Created index template "${templateName}" (${tsds ? 'TSDS' : 'non-TSDS'})${
          tsds && lookBackTime ? ` look_back_time=${lookBackTime}` : ''
        }`
      );
    } catch (error) {
      // Fail loud: a missing/half-applied template silently changes the index
      // mapping (TSDS vs plain), which would skew anything indexed against it.
      // Rethrow so `index()` leaves `otelTemplateCreated` false and the caller
      // sees the failure instead of producing misleading data.
      this.logger.error(`Failed to create index template "${templateName}": ${error}`);
      throw error;
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

type OtelIndexTemplate = NonNullable<IndicesPutIndexTemplateRequest['template']>;

// Historical plain data-stream template. Kept byte-for-byte compatible with
// the pre-benchmark default so non-opted-in consumers (e.g. existing
// performance journeys) see no behavior change.
function buildPlainOtelTemplate(): OtelIndexTemplate {
  return {
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
  };
}

// Production-shaped TSDS template. Production OTel hostmetricsreceiver data
// lands as a TSDS, so benchmark scenarios opt into `index.mode: time_series`
// to keep the seeded data on the same code path the Hosts UI exercises in
// production.
//
// `routing_path` must reference fields declared with
// `time_series_dimension: true`. `host.name` + `metricset.name` together
// uniquely partition the fleet's time series; other dimensions (`state`,
// `direction`, `device.keyword`, …) further discriminate within each
// partition and are declared as dimensions below but intentionally omitted
// from `routing_path` to keep shard routing predictable.
//
// `lookBackTime` widens the TSDS acceptance window so backdated
// `--from`/`--to` seed ranges ingest without rejection.
function buildTsdsOtelTemplate(lookBackTime?: string): OtelIndexTemplate {
  const keyword = { type: 'keyword' as const, time_series_dimension: true };
  const gauge = { type: 'double' as const, time_series_metric: 'gauge' as const };
  const longGauge = { type: 'long' as const, time_series_metric: 'gauge' as const };

  return {
    settings: {
      index: {
        mode: 'time_series',
        routing_path: ['host.name', 'metricset.name'],
        ...(lookBackTime ? { look_back_time: lookBackTime } : {}),
      },
    },
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
        agent: { properties: { id: keyword } },
        host: {
          properties: {
            name: keyword,
            hostname: keyword,
            // One IP per fleet in the fixture, so the value is constant —
            // keep as plain `ip` to avoid an unnecessary routing contribution.
            ip: { type: 'ip' },
            os: { properties: { name: keyword } },
          },
        },
        cloud: { properties: { provider: keyword, region: keyword } },
        data_stream: {
          properties: { dataset: keyword, type: keyword, namespace: keyword },
        },
        metricset: { properties: { name: keyword } },
        state: keyword,
        direction: keyword,
        device: { properties: { keyword } },
        // Metric fields are explicit so the `strings_as_keyword` dynamic
        // template doesn't promote a metric to keyword and so each carries
        // the right `time_series_metric`. The Hosts UI inventory model queries
        // both `system.*` and the `metrics.system.*` variants, so both shapes
        // are mapped.
        metrics: {
          properties: {
            system: {
              properties: {
                cpu: {
                  properties: {
                    utilization: gauge,
                    logical: { properties: { count: longGauge } },
                    load_average: { properties: { '1m': gauge } },
                  },
                },
                filesystem: { properties: { usage: gauge } },
                // `system.network.io` is a cumulative counter in production,
                // but the `SemconvHost.network()` generator emits independent
                // per-sample values, so it behaves like a gauge in the fixture.
                network: { properties: { io: longGauge } },
              },
            },
          },
        },
        system: {
          properties: {
            memory: { properties: { utilization: gauge, usage: gauge } },
          },
        },
      },
    },
  };
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
