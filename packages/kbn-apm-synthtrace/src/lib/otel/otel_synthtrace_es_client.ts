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
    this.dataStreams = ['.otel-*-synth', '*-synth-*'];
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
      let index: string | undefined;

      switch (document?.attributes?.['processor.event']) {
        case 'transaction':
        case 'span':
          index = `.ds-traces-generic.otel-${namespace}-synth-2024.09.09-000001`;
          // document._index = `.ds-traces-generic.otel-${namespace}-synth-2024.09.09-000001`;
          break;

        case 'error':
          index = `.logs-otel.error-${namespace}-synth-2024.09.09-000001`;
          // document._index = `logs-otel.error-${namespace}-synth-2024.09.09-000001`;
          break;

        case 'metric':
          const metricsetName = document.attributes['metricset.name'];
          document._index = `.ds-metrics-otel.service_summary.${document.attributes[
            'metricset.interval'
          ]!}-${namespace}-synth-2024.09.09-000001`;

          // if (metricsetName === 'app') {
          //   index = `metrics-otel.app.${document?.attributes?.['service.name']}-${namespace}-2024.09.09-000001`;
          // } else 
          if (
            metricsetName === 'transaction' ||
            metricsetName === 'service_transaction' ||
            metricsetName === 'service_destination' ||
            metricsetName === 'service_summary'
          ) {
            index = `.ds-metrics-otel.${metricsetName}.${document.attributes[
              'metricset.interval'
            ]!}-${namespace}-2024.09.09-000001`;
          } else {
            index = `metrics-otel.internal-${namespace}`;
          }
          break;
        default:
          // if (document['event.action'] != null) {
          //   index = `logs-otel.app-${namespace}`;
          // }
          break;
      }

      if (!index) {
        const error = new Error('Cannot determine index for event');
        Object.assign(error, { document });
      }

      document._index = index;

      callback(null, document);
    },
  });
}
