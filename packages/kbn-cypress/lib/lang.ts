/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import bluebird from 'bluebird';

bluebird.Promise.config({
  cancellation: true,
});
export const BPromise = bluebird.Promise;

export const safe =
  <T extends any[], R extends any>(
    fn: (...args: T) => Promise<R>,
    ifFaled: (e: unknown) => any,
    ifSucceed: () => any
  ) =>
  async (...args: T) => {
    try {
      const r = await fn(...args);
      ifSucceed();
      return r;
    } catch (e) {
      ifFaled(e);
    }
  };
