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
  EdotBrowserSpanDocument,
  ESDocumentWithOperation,
  Fields,
  OtelLogDocument,
} from '@kbn/synthtrace-client';
import type { Readable } from 'stream';
import { pipeline, Transform } from 'stream';
import type { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { SynthtraceEsClientBase } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import type { Logger } from '../utils/create_logger';

export type OtelDocument = OtelLogDocument | EdotBrowserSpanDocument;

export type OtelSynthtraceEsClient = SynthtraceEsClient<OtelDocument>;

export type OtelSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

interface Pipeline {
  includeSerialization?: boolean;
}

interface DataStreamFields {
  type?: string;
  dataset?: string;
  namespace?: string;
}

type RoutableDocument = Fields & {
  _index?: string;
  data_stream?: DataStreamFields;
  'data_stream.type'?: string;
  'data_stream.dataset'?: string;
  'data_stream.namespace'?: string;
};

/** Returns the explicit `_index` of an OTel document, or derives it from its `data_stream` fields. */
export const getOtelDocumentIndex = (document: RoutableDocument): string => {
  if (document._index) {
    return document._index;
  }

  const type = document.data_stream?.type ?? document['data_stream.type'];
  const dataset = document.data_stream?.dataset ?? document['data_stream.dataset'];
  const namespace = document.data_stream?.namespace ?? document['data_stream.namespace'];
  if (type && dataset && namespace) {
    return `${type}-${dataset}-${namespace}`;
  }

  throw new Error('Cannot determine index for event');
};

const getOtelRoutingTransform = () =>
  new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OtelDocument>, encoding, callback) {
      try {
        document._index = getOtelDocumentIndex(document);
        callback(null, document);
      } catch (error) {
        callback(error);
      }
    },
  });

/**
 * Indexes OTel-native documents as-is: no OTel to APM translation, no metric aggregation.
 * Documents are routed by `_index` or their `data_stream` fields.
 */
export class OtelSynthtraceEsClientImpl
  extends SynthtraceEsClientBase<OtelDocument>
  implements OtelSynthtraceEsClient
{
  constructor(
    options: { client: Client; logger: Logger; pipeline?: Pipeline } & OtelSynthtraceEsClientOptions
  ) {
    super({
      ...options,
      pipeline: otelPipeline({ includeSerialization: options.pipeline?.includeSerialization }),
    });
    this.dataStreams = ['logs-*.otel-*', 'traces-*.otel-*'];
  }
}

function otelPipeline({ includeSerialization = true }: Pipeline) {
  return (base: Readable) => {
    const onError = (err: NodeJS.ErrnoException | null) => {
      if (err) {
        throw err;
      }
    };

    return includeSerialization
      ? pipeline(base, getSerializeTransform<OtelDocument>(), getOtelRoutingTransform(), onError)
      : pipeline(base, getOtelRoutingTransform(), onError);
  };
}
