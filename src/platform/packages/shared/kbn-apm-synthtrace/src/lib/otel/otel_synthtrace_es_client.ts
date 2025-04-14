/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    this.dataStreams = ['metrics-generic.otel*', 'traces-generic.otel*', 'logs-generic.otel*'];
  }

  getDefaultPipeline(
    {
      includeSerialization,
    }: {
      includeSerialization?: boolean;
    } = { includeSerialization: true }
  ) {
    return otelPipeline(includeSerialization);
  }
}

function otelPipeline(includeSerialization: boolean = true) {
  const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];
  return (base: Readable) => {
    return pipeline(
      // @ts-expect-error see apm_pipeline.ts
      base,
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

export function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OtelDocument>, encoding, callback) {
      const namespace = 'default';
      let index: string | undefined;

      switch (document?.attributes?.['processor.event']) {
        case 'transaction':
        case 'span':
          index = `traces-generic.otel-${namespace}-synth`;
          break;

        case 'error':
          index = `logs-generic.otel-${namespace}-synth`;
          break;

        case 'metric':
          const metricsetName = document?.attributes?.['metricset.name'];
          if (
            metricsetName === 'transaction' ||
            metricsetName === 'service_transaction' ||
            metricsetName === 'service_destination' ||
            metricsetName === 'service_summary'
          ) {
            index = `metrics-generic.otel.${metricsetName}.${document.attributes[
              'metricset.interval'
            ]!}-${namespace}-synth`;
          } else {
            index = `metrics-generic.otel.internal-${namespace}-synth`;
          }
          break;
        default:
          if (document?.attributes?.['event.action'] != null) {
            index = `logs-generic.otel-${namespace}-synth`;
          }
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
