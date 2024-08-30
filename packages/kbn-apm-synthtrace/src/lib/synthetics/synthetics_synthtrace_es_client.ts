/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation, SyntheticsMonitorDocument } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type SyntheticsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class SyntheticsSynthtraceEsClient extends SynthtraceEsClient<SyntheticsMonitorDocument> {
  constructor(options: { client: Client; logger: Logger } & SyntheticsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: syntheticsPipeline(),
    });
    this.dataStreams = ['synthetics-*-*'];
  }
}

function syntheticsPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<SyntheticsMonitorDocument>(),
      getRoutingTransform(),
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
    transform(document: ESDocumentWithOperation<SyntheticsMonitorDocument>, encoding, callback) {
      if (
        'data_stream.type' in document &&
        'data_stream.dataset' in document &&
        'data_stream.namespace' in document
      ) {
        document._index = `${document['data_stream.type']}-${document['data_stream.dataset']}-${document['data_stream.namespace']}`;
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
