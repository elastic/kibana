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

  describe('datasource nesting prevention', () => {
    it('rejects a datasource function nested as an argument to another datasource', () => {
      expect(() => processExpression('.static(.static(42))')).toThrow(
        /Cannot use datasource function static\(\) as an argument to another datasource function/
      );
    });

    it('rejects deeply nested datasource functions', () => {
      expect(() => processExpression('.static(.static(.static(42)))')).toThrow(
        /Cannot use datasource function static\(\) as an argument to another datasource function/
      );
    });

    it('rejects any datasource function nested inside another datasource regardless of type', () => {
      expect(() => processExpression('.worldbank(.static(42))')).toThrow(
        /Cannot use datasource function static\(\) as an argument to another datasource function/
      );
    });

    it('allows a datasource as an argument to a non-datasource function', async () => {
      const sheets = await processExpression('.static(5).sum(.static(10))');
      const results = await Promise.all(sheets);

      expect(results[0].list[0].data[0][1]).toBe(15);
    });
  });

  describe('circular reference prevention', () => {
    it('rejects self-referencing expressions that would cause infinite recursion', async () => {
      const sheets = await processExpression('.static(5), .static(10).sum(@1)');

      await expect(Promise.all(sheets)).rejects.toThrow(
        /Maximum expression resolution depth exceeded/
      );
    });

    it('rejects direct self-reference on a single series', async () => {
      const sheets = await processExpression('.static(5).sum(@1:1)');

      await expect(Promise.all(sheets)).rejects.toThrow(
        /Maximum expression resolution depth exceeded/
      );
    });

    it('allows non-circular references between series in the same expression', async () => {
      const sheets = await processExpression('.static(5), .static(10).sum(@1:1)');
      const results = await Promise.all(sheets);

      expect(results[0].list).toHaveLength(2);
      expect(results[0].list[0].data[0][1]).toBe(5);
      expect(results[0].list[1].data[0][1]).toBe(15);
    });

    it('allows many parallel non-circular references', async () => {
      const numberOfSeries = 11; // 10 series + the initial series > MAX_RESOLVE_DEPTH
      const series = ['.static(1)'];
      for (let i = 2; i <= numberOfSeries; i++) {
        series.push(`.static(${i}).sum(@1:1)`);
      }
      const expression = series.join(', ');
      const sheets = await processExpression(expression);
      const results = await Promise.all(sheets);

      expect(results[0].list).toHaveLength(numberOfSeries);
      expect(results[0].list[0].data[0][1]).toBe(1);
      for (let i = 1; i < numberOfSeries; i++) {
        expect(results[0].list[i].data[0][1]).toBe(i + 2);
      }
    });
  });
});
