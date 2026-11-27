/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DeferredInitEngine } from './deferred_init_engine';

describe('DeferredInitEngine', () => {
  describe('#startInitialization', () => {
    it('starts every run once, in the given order', () => {
      const calls: string[] = [];
      const run = (name: string) => jest.fn(() => calls.push(name));
      const runs = [run('foo'), run('bar')];

      new DeferredInitEngine().startInitialization(runs);

      expect(calls).toEqual(['foo', 'bar']);
      runs.forEach((started) => expect(started).toHaveBeenCalledTimes(1));
    });
  });
});
