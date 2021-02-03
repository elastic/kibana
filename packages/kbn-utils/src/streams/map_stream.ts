/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';

export function createMapStream<T>(fn: (value: T, i: number) => void) {
  let i = 0;

  return new Transform({
    objectMode: true,
    async transform(value, enc, done) {
      try {
        this.push(await fn(value, i++));
        done();
      } catch (err) {
        done(err);
      }
    },
  });
}
