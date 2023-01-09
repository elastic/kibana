/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, estypes } from '@elastic/elasticsearch';
import {
  ApmFields,
  ESDocumentWithOperation,
  SynthtraceESAction,
  SynthtraceGenerator,
} from '@kbn/apm-synthtrace-client';
import { castArray } from 'lodash';
import { PassThrough, pipeline, Readable, Transform } from 'stream';
import { isGeneratorObject } from 'util/types';
import { ValuesType } from 'utility-types';
import { Logger } from '../../../utils/create_logger';
import { fork, sequential } from '../../../utils/stream_utils';
import { createBreakdownMetricsAggregator } from '../../aggregators/create_breakdown_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../aggregators/create_span_metrics_aggregator';
import { createTransactionMetricsAggregator } from '../../aggregators/create_transaction_metrics_aggregator';
import { getApmServerMetadataTransform } from './get_apm_server_metadata_transform';
import { getDedotTransform } from './get_dedot_transform';
import { getIntakeDefaultsTransform } from './get_intake_defaults_transform';
import { getRoutingTransform } from './get_routing_transform';
import { getSerializeTransform } from './get_serialize_transform';

export interface ApmSynthtraceEsClientOptions {
  version: string;
  concurrency?: number;
  refreshAfterIndex?: boolean;
}

type MaybeArray<T> = T | T[];

const DATA_STREAMS = ['traces-apm*', 'metrics-apm*', 'logs-apm*'];

export enum ComponentTemplateName {
  LogsApp = 'logs-apm.app@custom',
  LogsError = 'logs-apm.error@custom',
  MetricsApp = 'metrics-apm.app@custom',
  MetricsInternal = 'metrics-apm.internal@custom',
  TracesApm = 'traces-apm@custom',
  TracesApmRum = 'traces-apm.rum@custom',
  TracesApmSampled = 'traces-apm.sampled@custom',
}

export class ApmSynthtraceEsClient {
  private readonly client: Client;
  private readonly logger: Logger;

  private readonly concurrency: number;

  private readonly refreshAfterIndex: boolean;

  private readonly version: string;

  private pipelineCallback: (base: Readable) => NodeJS.WritableStream = this.getDefaultPipeline();

  constructor(options: { client: Client; logger: Logger } & ApmSynthtraceEsClientOptions) {
    this.client = options.client;
    this.logger = options.logger;
    this.concurrency = options.concurrency ?? 1;
    this.refreshAfterIndex = options.refreshAfterIndex ?? false;
    this.version = options.version;
  }

  async clean() {
    this.logger.info(`Cleaning APM data streams ${DATA_STREAMS.join(', ')}`);

    for (const name of DATA_STREAMS) {
      const dataStream = await this.client.indices.getDataStream({ name }, { ignore: [404] });
      if (dataStream.data_streams && dataStream.data_streams.length > 0) {
        this.logger.debug(`Deleting datastream: ${name}`);
        await this.client.indices.deleteDataStream({ name });
      }
    }
  }

  async updateComponentTemplate(
    name: ComponentTemplateName,
    modify: (
      template: ValuesType<
        estypes.ClusterGetComponentTemplateResponse['component_templates']
      >['component_template']['template']
    ) => estypes.ClusterPutComponentTemplateRequest['template']
  ) {
    const response = await this.client.cluster.getComponentTemplate({
      name,
    });

    const template = response.component_templates[0];

    await this.client.cluster.putComponentTemplate({
      name,
      template: {
        ...modify(template.component_template.template),
      },
    });

    this.logger.info(`Updated component template: ${name}`);
  }

  async refresh(dataStreams: string[] = DATA_STREAMS) {
    this.logger.info(`Refreshing ${dataStreams.join(',')}`);

    return this.client.indices.refresh({
      index: dataStreams,
      allow_no_indices: true,
      ignore_unavailable: true,
    });
  }

  getDefaultPipeline(includeSerialization: boolean = true) {
    return (base: Readable) => {
      const aggregators = [
        createTransactionMetricsAggregator('1m'),
        createSpanMetricsAggregator('1m'),
      ];

      const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];

      return pipeline(
        // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
        base,
        ...serializationTransform,
        getIntakeDefaultsTransform(),
        fork(new PassThrough({ objectMode: true }), ...aggregators),
        createBreakdownMetricsAggregator('30s'),
        getApmServerMetadataTransform(this.version),
        getRoutingTransform(),
        getDedotTransform(),
        (err) => {
          if (err) {
            this.logger.error(err);
          }
        }
      );
    };
  }

  pipeline(cb: (base: Readable) => NodeJS.WritableStream) {
    this.pipelineCallback = cb;
  }

  getVersion() {
    return this.version;
  }

  async index(streamOrGenerator: MaybeArray<Readable | SynthtraceGenerator<ApmFields>>) {
    this.logger.debug(`Bulk indexing ${castArray(streamOrGenerator).length} stream(s)`);

    const allStreams = castArray(streamOrGenerator).map((obj) => {
      const base = isGeneratorObject(obj) ? Readable.from(obj) : obj;

      return this.pipelineCallback(base);
    }) as Transform[];

    let count: number = 0;

    const stream = sequential(...allStreams);

    await this.client.helpers.bulk({
      concurrency: this.concurrency,
      refresh: false,
      refreshOnCompletion: false,
      flushBytes: 250000,
      datasource: stream,
      filter_path: 'errors,items.*.error,items.*.status',
      onDocument: (doc: ESDocumentWithOperation<ApmFields>) => {
        let action: SynthtraceESAction;
        count++;

        if (count % 100000 === 0) {
          this.logger.info(`Indexed ${count} documents`);
        } else if (count % 1000 === 0) {
          this.logger.debug(`Indexed ${count} documents`);
        }

        if (doc._action) {
          action = doc._action!;
          delete doc._action;
        } else if (doc._index) {
          action = { create: { _index: doc._index } };
          delete doc._index;
        } else {
          this.logger.debug(doc);
          throw new Error(
            `Could not determine operation: _index and _action not defined in document`
          );
        }

        return action;
      },
      onDrop: (doc) => {
        this.logger.error(`Dropped document: ${JSON.stringify(doc, null, 2)}`);
      },
    });

    this.logger.info(`Produced ${count} events`);

    if (this.refreshAfterIndex) {
      await this.refresh();
    }
  }
}
