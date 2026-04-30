/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chainRunner from './chain_runner';

describe('chain_runner', () => {
  let tlConfig;
  let runner;

  beforeAll(() => {
    tlConfig = require('../series_functions/fixtures/tl_config')();
  });

  function processExpression(expression) {
    runner = chainRunner(tlConfig);
    return runner.processRequest({
      sheet: [expression],
      time: {
        from: '1980-01-01T00:00:00Z',
        to: '1983-01-01T00:00:00Z',
        interval: '1y',
        timezone: 'Etc/UTC',
      },
    });
  }

  describe('datasource chaining prevention', () => {
    it('rejects chaining a datasource function after another function', async () => {
      const sheets = await processExpression('.static(5).static(10)');

      await expect(Promise.all(sheets)).rejects.toThrow(
        /Cannot chain datasource function static\(\) after another function/
      );
    });

    it('allows a datasource at the start of a chain followed by chainable functions', async () => {
      const sheets = await processExpression('.static(5).label("test")');
      const results = await Promise.all(sheets);

      expect(results[0].list[0].label).toBe('test');
      expect(results[0].list[0].data[0][1]).toBe(5);
    });

    it('allows a single datasource function with no chaining', async () => {
      const sheets = await processExpression('.static(42)');
      const results = await Promise.all(sheets);

      expect(results[0].list).toHaveLength(1);
      expect(results[0].list[0].data[0][1]).toBe(42);
    });

    it('allows multiple chainable functions after a datasource', async () => {
      const sheets = await processExpression('.static(5).label("hello").color("#f00")');
      const results = await Promise.all(sheets);

      expect(results[0].list[0].label).toBe('hello');
      expect(results[0].list[0].data[0][1]).toBe(5);
      expect(results[0].list[0].color).toBe('#f00');
    });
  });
});
