/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../parser';
import { printAst } from '../../../../debug';
import type { PromQLFunction, PromQLSelector } from '../../types';

describe('PromQL "function" node parsing', () => {
  const parseFunction = (query: string): PromQLFunction => {
    const result = PromQLParser.parse(query);
    expect(result.errors).toHaveLength(0);
    expect(result.root.expression?.type).toBe('function');

    return result.root.expression as PromQLFunction;
  };

  describe('basic function calls', () => {
    it('parses a simple function call with no arguments', () => {
      const func = parseFunction('time()');

      expect(func.name).toBe('time');
      expect(func.args).toHaveLength(0);
      expect(func.grouping).toBeUndefined();
      expect(func.groupingPosition).toBeUndefined();
    });

    it('parses a function call with a single argument', () => {
      const func = parseFunction('rate(http_requests_total[5m])');

      expect(func.name).toBe('rate');
      expect(func.args).toHaveLength(1);
      expect(func.args[0].type).toBe('selector');
      expect(func.grouping).toBeUndefined();
      expect(func.groupingPosition).toBeUndefined();
    });

    it('parses a function call with multiple arguments', () => {
      const func = parseFunction(
        'histogram_quantile(0.9, rate(http_request_duration_seconds_bucket[5m]))'
      );

      expect(func.name).toBe('histogram_quantile');
      expect(func.args).toHaveLength(2);
      expect(func.args[0].type).toBe('literal');
      expect(func.args[1].type).toBe('function');
    });

    it('parses nested function calls', () => {
      const func = parseFunction('sum(rate(http_requests_total[5m]))');

      expect(func.name).toBe('sum');
      expect(func.args).toHaveLength(1);

      const innerFunc = func.args[0] as PromQLFunction;
      expect(innerFunc.type).toBe('function');
      expect(innerFunc.name).toBe('rate');
    });
  });

  describe('grouping position - before arguments', () => {
    it('parses sum by (label) (expr) - grouping before args', () => {
      const func = parseFunction('sum by (job) (http_requests_total)');

      expect(func.name).toBe('sum');
      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('by');
      expect(func.grouping?.args).toHaveLength(1);
      expect(func.grouping?.args[0].name).toBe('job');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses avg without (label) (expr) - grouping before args', () => {
      const func = parseFunction('avg without (instance) (cpu_usage)');

      expect(func.name).toBe('avg');
      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('without');
      expect(func.grouping?.args).toHaveLength(1);
      expect(func.grouping?.args[0].name).toBe('instance');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses grouping with multiple labels before args', () => {
      const func = parseFunction('sum by (job, instance, status) (http_requests_total)');

      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('by');
      expect(func.grouping?.args).toHaveLength(3);
      expect(func.grouping?.args[0].name).toBe('job');
      expect(func.grouping?.args[1].name).toBe('instance');
      expect(func.grouping?.args[2].name).toBe('status');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses count by (label) with nested function - grouping before args', () => {
      const func = parseFunction('count by (status) (rate(http_requests_total[5m]))');

      expect(func.name).toBe('count');
      expect(func.grouping?.name).toBe('by');
      expect(func.groupingPosition).toBe('before');

      const innerFunc = func.args[0] as PromQLFunction;
      expect(innerFunc.type).toBe('function');
      expect(innerFunc.name).toBe('rate');
    });
  });

  describe('grouping position - after arguments', () => {
    it('parses sum(expr) by (label) - grouping after args', () => {
      const func = parseFunction('sum(http_requests_total) by (job)');

      expect(func.name).toBe('sum');
      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('by');
      expect(func.grouping?.args).toHaveLength(1);
      expect(func.grouping?.args[0].name).toBe('job');
      expect(func.groupingPosition).toBe('after');
    });

    it('parses avg(expr) without (label) - grouping after args', () => {
      const func = parseFunction('avg(cpu_usage) without (instance)');

      expect(func.name).toBe('avg');
      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('without');
      expect(func.grouping?.args).toHaveLength(1);
      expect(func.grouping?.args[0].name).toBe('instance');
      expect(func.groupingPosition).toBe('after');
    });

    it('parses grouping with multiple labels after args', () => {
      const func = parseFunction('sum(http_requests_total) by (job, instance, status)');

      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('by');
      expect(func.grouping?.args).toHaveLength(3);
      expect(func.grouping?.args[0].name).toBe('job');
      expect(func.grouping?.args[1].name).toBe('instance');
      expect(func.grouping?.args[2].name).toBe('status');
      expect(func.groupingPosition).toBe('after');
    });

    it('parses count(nested_func) by (label) - grouping after args', () => {
      const func = parseFunction('count(rate(http_requests_total[5m])) by (status)');

      expect(func.name).toBe('count');
      expect(func.grouping?.name).toBe('by');
      expect(func.groupingPosition).toBe('after');

      const innerFunc = func.args[0] as PromQLFunction;
      expect(innerFunc.type).toBe('function');
      expect(innerFunc.name).toBe('rate');
    });
  });

  describe('no grouping', () => {
    it('rate() has no grouping', () => {
      const func = parseFunction('rate(http_requests_total[5m])');

      expect(func.grouping).toBeUndefined();
      expect(func.groupingPosition).toBeUndefined();
    });
  });

  describe('aggregation operators', () => {
    it('parses sum aggregation', () => {
      const func = parseFunction('sum(http_requests_total)');

      expect(func.name).toBe('sum');
      expect(func.args).toHaveLength(1);
    });

    it('parses min aggregation', () => {
      const func1 = parseFunction('min(http_requests_total)');
      const func2 = parseFunction('max(http_requests_total)');
      const func3 = parseFunction('avg(http_requests_total)');

      expect(func1.name).toBe('min');
      expect(func2.name).toBe('max');
      expect(func3.name).toBe('avg');
    });

    it('parses topk aggregation', () => {
      const func = parseFunction('topk(5, http_requests_total)');

      expect(func.name).toBe('topk');
      expect(func.args).toHaveLength(2);
    });
  });

  describe('range functions', () => {
    it('parses rate function', () => {
      const func = parseFunction('rate(http_requests_total[5m])');

      expect(func.name).toBe('rate');
      const selector = func.args[0] as PromQLSelector;
      expect(selector.type).toBe('selector');
      expect(selector.duration).toBeDefined();
    });

    it('parses irate function', () => {
      const func1 = parseFunction('irate(http_requests_total[5m])');
      const func2 = parseFunction('increase(http_requests_total[1h])');

      expect(func1.name).toBe('irate');
      expect(func2.name).toBe('increase');
    });
  });

  describe('complex function expressions', () => {
    it('parses deeply nested functions', () => {
      const func = parseFunction('sum by (job) (rate(increase(http_requests_total[5m])[1h:5m]))');

      expect(func.name).toBe('sum');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses function with complex selector argument', () => {
      const func = parseFunction('rate(http_requests_total{job="api", status=~"5.."}[5m])');

      expect(func.name).toBe('rate');
      const selector = func.args[0] as PromQLSelector;
      expect(selector.labelMap?.args).toHaveLength(2);
    });

    it('parses aggregation with grouping and nested rate', () => {
      const func = parseFunction('sum(rate(http_requests_total{job="api"}[5m])) by (status)');

      expect(func.name).toBe('sum');
      expect(func.grouping?.name).toBe('by');
      expect(func.groupingPosition).toBe('after');

      const innerFunc = func.args[0] as PromQLFunction;
      expect(innerFunc.name).toBe('rate');
    });

    it('parses topk with grouping before', () => {
      const func = parseFunction('topk by (job) (5, http_requests_total)');

      expect(func.name).toBe('topk');
      expect(func.grouping?.name).toBe('by');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses topk with grouping after', () => {
      const func = parseFunction('topk(5, http_requests_total) by (job)');

      expect(func.name).toBe('topk');
      expect(func.grouping?.name).toBe('by');
      expect(func.groupingPosition).toBe('after');
    });
  });

  describe('function location tracking', () => {
    it('tracks function location correctly', () => {
      const func = parseFunction('  sum(http_requests_total)  ');
      const tree = printAst(func);

      expect('\n' + tree).toBe(`
function 2-25 "sum"
└─ selector 6-24 "http_requests_total"
   └─ identifier 6-24 "http_requests_total"`);
    });

    it('tracks .location of complex function with grouping', () => {
      const func = parseFunction(
        'sum by (job,hobby, entertainment) (http_requests_total, 1,"string")'
      );
      const tree = printAst(func);

      expect('\n' + tree).toBe(`
function 0-66 "sum"
├─ grouping 4-32 "by"
│  ├─ identifier 8-10 "job"
│  ├─ identifier 12-16 "hobby"
│  └─ identifier 19-31 "entertainment"
├─ selector 35-53 "http_requests_total"
│  └─ identifier 35-53 "http_requests_total"
├─ literal 56-56 "1"
└─ literal 58-65 ""string""`);
    });

    it('can extract source text of each node', () => {
      const src = ' a by (b, c,d,e, f)  \n ( g,  h, \n 1,  2, 42  ) ';
      const func = parseFunction(src);
      const tree = printAst(func, {
        src,
        printSrc: true,
        location: false,
        text: false,
        compact: true,
      });

      expect('\n' + tree).toBe(`
function "a by (b, c,d,e, f)  \\n ( g,  h, \\n 1,  2, 42  )"
├─ grouping "by (b, c,d,e, f)"
│  ├─ identifier "b"
│  ├─ identifier "c"
│  ├─ identifier "d"
│  ├─ identifier "e"
│  └─ identifier "f"
├─ selector "g"
│  └─ identifier "g"
├─ selector "h"
│  └─ identifier "h"
├─ literal "1"
├─ literal "2"
└─ literal "42"`);
    });
  });
});
