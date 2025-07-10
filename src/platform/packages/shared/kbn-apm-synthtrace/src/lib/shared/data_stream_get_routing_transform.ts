/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESDocumentWithOperation, Fields } from '@kbn/apm-synthtrace-client';
import { Transform } from 'stream';

export function getRoutingTransform<T extends Fields>(dataStreamType: string) {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<T>, encoding, callback) {
      if ('data_stream.dataset' in document && 'data_stream.namespace' in document) {
        document._index = `${dataStreamType}-${document['data_stream.dataset']}-${document['data_stream.namespace']}`;
      } else if (!('_index' in document)) {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
