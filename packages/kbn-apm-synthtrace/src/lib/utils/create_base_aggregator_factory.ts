/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '@kbn/apm-synthtrace-client';
import { Duplex, PassThrough } from 'stream';

export function getCreateBaseAggregatorFactory<TFields extends Fields>() {
  return function <TMetric extends Record<string, any>, TOutput extends Record<string, any>>(
    {
      filter,
      init,
      getHashedKeys,
    }: {
      filter: (event: TFields) => boolean;
      init: (
        event: TFields,
        aggregatedDocument?: TMetric & { '@timestamp'?: number }
      ) => { doc?: TMetric; shouldFlush?: boolean };
      getHashedKeys: (event: TFields) => string;
      // init: (event: TFields) => TMetric;
    },
    reduce: (metric: TMetric, event: TFields) => void,
    serialize: (metric: TMetric) => TOutput
  ) {
    let cb: (() => void) | undefined;

    const aggregatedDocs: Map<string, TMetric & { '@timestamp'?: number }> = new Map();

    let toFlush: TMetric[] = [];

    function flush(stream: Duplex, includeCurrentDocuments: boolean, callback?: () => void) {
      const allItems = [...toFlush];

      toFlush = [];

      if (includeCurrentDocuments) {
        allItems.push(...aggregatedDocs.values());
        aggregatedDocs.clear();
      }

      while (allItems.length) {
        const next = allItems.shift()!;
        const serialized = serialize(next);
        const shouldWriteNext = stream.push(serialized);
        if (!shouldWriteNext) {
          toFlush = allItems;
          cb = callback;
          return;
        }
      }

      const next = cb;
      cb = undefined;
      next?.();
      callback?.();
    }

    return new PassThrough({
      objectMode: true,
      read() {
        flush(this, false, cb);
      },
      final(callback) {
        flush(this, true, callback);
      },
      write(event: TFields, encoding, callback) {
        if (!filter(event)) {
          callback();
          return;
        }

        const key = getHashedKeys(event);
        const aggregatedDocument = aggregatedDocs.get(key);
        const { doc, shouldFlush = false } = init(event, aggregatedDocument);

        if (shouldFlush) {
          flush(this, true, callback);
        } else {
          if (doc) {
            aggregatedDocs.set(key, doc);
            reduce(doc, event);
          }

          callback();
        }
      },
    });
  };
}
