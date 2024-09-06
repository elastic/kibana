/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { OtelDocument } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type OtelSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class OtelSynthtraceEsClient extends SynthtraceEsClient<OtelDocument> {
  constructor(options: { client: Client; logger: Logger } & OtelSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: otelPipeline(),
    });
    this.dataStreams = [
      '.otel-*',
      'metrics-*',
      'logs-*.',
      'traces-*.',
      'generic.otel-*',
      'traces-otel-default',
      'metric-otel-*',
      'logs-otel.error-*',
      '*-otel-*',
    ];
  }
}

function otelPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform(),
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

export function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OtelDocument>, encoding, callback) {
      const namespace = 'default';
      let index: string | undefined = 'traces-otel-default';
      console.log(document);
      console.log('doc', document.attributes[`processor.event`]);

      switch (document.attributes['processor.event']) {
        case 'transaction':
        case 'span':
          index = `traces-otel-${namespace}`;
          document._index = `traces-otel-${namespace}`;
          break;

        case 'error':
          index = `logs-otel.error-${namespace}`;
          document._index = `logs-otel.error-${namespace}`;
          break;

        case 'metric':
          const metricsetName = document.attributes['metricset.name'];
          document._index = `metrics-otel.${metricsetName}.${document.attributes['metricset.interval']!}-${namespace}`;

          if (metricsetName === 'app') {
            index = `metrics-otel.app.${document.attributes['service.name']}-${namespace}`;
          } else if (
            metricsetName === 'transaction' ||
            metricsetName === 'service_transaction' ||
            metricsetName === 'service_destination' ||
            metricsetName === 'service_summary'
          ) {
            index = `metrics-otel.${metricsetName}.${document.attributes['metricset.interval']!}-${namespace}`;
          } else {
            index = `metrics-otel.internal-${namespace}`;
          }
          break;
        default:
          if (document['event.action'] != null) {
            index = `logs-otel.app-${namespace}`;
          }
          break;
      }

      console.log('index', index);
      if (!index) {
        const error = new Error('Cannot determine index for event');
        Object.assign(error, { document });
      }

      // document._index = index;

      callback(null, document);
    },
  });
}
