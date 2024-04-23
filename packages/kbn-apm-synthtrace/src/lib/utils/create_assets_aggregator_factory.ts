/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { appendHash, Fields } from '@kbn/apm-synthtrace-client';
import { ServiceAssetDocument } from '@kbn/apm-synthtrace-client/src/lib/assets/service_assets';
import { Duplex, PassThrough } from 'stream';

export function assetsAggregatorFactory<TFields extends Fields>() {
  return function <TAsset extends Record<string, any>, TOutput extends Record<string, any>>(
    {
      filter,
      getAggregateKey,
      init,
    }: {
      filter: (event: TFields) => boolean;
      getAggregateKey: (event: TFields) => string;
      init: (event: TFields) => ServiceAssetDocument;
    },
    reduce: (asset: ServiceAssetDocument, event: TFields) => void,
    serialize: (asset: ServiceAssetDocument) => TOutput
  ) {
    const assets: Map<string, ServiceAssetDocument> = new Map();

    let toFlush: ServiceAssetDocument[] = [];
    let cb: (() => void) | undefined;

    function flush(stream: Duplex, includeCurrentAssets: boolean, callback?: () => void) {
      const allItems = [...toFlush];

      toFlush = [];

      if (includeCurrentAssets) {
        allItems.push(...assets.values());
        assets.clear();
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

        function writeAssetAggregator() {
          const key = appendHash(getAggregateKey(event), '');

          let asset = assets.get(key);

          if (!asset) {
            asset = init({ ...event });
            assets.set(key, asset);
          }

          reduce(asset, event);
          callback();
        }

        writeAssetAggregator();
      },
    });
  };
}
