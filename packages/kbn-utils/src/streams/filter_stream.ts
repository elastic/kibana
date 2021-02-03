/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';

export function createFilterStream<T>(fn: (obj: T) => boolean) {
  return new Transform({
    objectMode: true,
    async transform(obj, enc, done) {
      const canPushDownStream = fn(obj);
      if (canPushDownStream) {
        this.push(obj);
      }
      done();
    },
  });
}
