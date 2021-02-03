/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Readable } from 'stream';

/**
 *  Create a Readable stream that provides the items
 *  from a list as objects to subscribers
 *
 *  @param  {Array<any>} items - the list of items to provide
 *  @return {Readable}
 */
export function createListStream<T = any>(items: T | T[] = []) {
  const queue = Array.isArray(items) ? [...items] : [items];

  return new Readable({
    objectMode: true,
    read(size) {
      queue.splice(0, size).forEach((item) => {
        this.push(item);
      });

      if (!queue.length) {
        this.push(null);
      }
    },
  });
}
