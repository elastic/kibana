/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { Readable, Transform, pipeline } from 'stream';
import { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { SynthtraceEsClient } from '../shared/base_client';
import { Logger } from '../utils/create_logger';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { getDedotTransform } from '../shared/get_dedot_transform';

export class EntitySynthtraceEsClient extends SynthtraceEsClient<any> {
  constructor(options: { client: Client; logger: Logger } & any) {
    super({
      ...options,
      pipeline: entityPipeline(),
    });
    this.dataStreams = ['.entities.v1.history*', '.entities.v1.latest*'];
  }
}

function entityPipeline() {
  return (base: Readable) => {
    const aggregators = [
      // createTracesServiceAssetsAggregator(),
      // createLogsServiceAssetsAggregator(),
    ];
    return pipeline(
      base,
      getSerializeTransform(),
      // fork(new PassThrough({ objectMode: true }), ...aggregators),
      // getAssetsFilterTransform(),
      // getMergeAssetsTransform(),
      firstSeenTimestampTransform(),
      lastSeenTimestampTransform(),
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

function firstSeenTimestampTransform() {
  let firstSeenTimestamp: number | undefined;
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<any>, encoding, callback) {
      const timestamp = document['@timestamp'] as number;
      if (firstSeenTimestamp === undefined) {
        firstSeenTimestamp = timestamp;
      }

      document['entity.firstSeenTimestamp'] = new Date(firstSeenTimestamp).toISOString();
      callback(null, document);
    },
  });
}

function lastSeenTimestampTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<any>, encoding, callback) {
      const timestamp = document['@timestamp'];
      document['entity.lastSeenTimestamp'] = new Date(timestamp).toISOString();
      callback(null, document);
    },
  });
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<any>, encoding, callback) {
      console.log('### caue  transform  document:', document);
      let index: string | undefined;
      const entityType: string | undefined = document['entity.type'];
      if (entityType === undefined) {
        throw new Error(`entity.type was not defined: ${JSON.stringify(document)}`);
      }
      const entityIndexName = entityType === 'service' ? 'services' : entityType;
      if ('@timestamp' in document) {
        index = `.entities.v1.history.builtin_${entityIndexName}`;
      } else {
        index = `.entities.v1.latest.builtin_${entityIndexName}`;
      }

      document._index = index;

      callback(null, document);
    },
  });
}
