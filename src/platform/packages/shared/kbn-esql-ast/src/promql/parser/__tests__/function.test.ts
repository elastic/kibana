/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../parser';
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
      expect(func.grouping?.labels).toHaveLength(1);
      expect(func.grouping?.labels[0].name).toBe('job');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses avg without (label) (expr) - grouping before args', () => {
      const func = parseFunction('avg without (instance) (cpu_usage)');

      expect(func.name).toBe('avg');
      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('without');
      expect(func.grouping?.labels).toHaveLength(1);
      expect(func.grouping?.labels[0].name).toBe('instance');
      expect(func.groupingPosition).toBe('before');
    });

    it('parses grouping with multiple labels before args', () => {
      const func = parseFunction('sum by (job, instance, status) (http_requests_total)');

      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('by');
      expect(func.grouping?.labels).toHaveLength(3);
      expect(func.grouping?.labels[0].name).toBe('job');
      expect(func.grouping?.labels[1].name).toBe('instance');
      expect(func.grouping?.labels[2].name).toBe('status');
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
      expect(func.grouping?.labels).toHaveLength(1);
      expect(func.grouping?.labels[0].name).toBe('job');
      expect(func.groupingPosition).toBe('after');
    });

    it('parses avg(expr) without (label) - grouping after args', () => {
      const func = parseFunction('avg(cpu_usage) without (instance)');

      expect(func.name).toBe('avg');
      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('without');
      expect(func.grouping?.labels).toHaveLength(1);
      expect(func.grouping?.labels[0].name).toBe('instance');
      expect(func.groupingPosition).toBe('after');
    });

    it('parses grouping with multiple labels after args', () => {
      const func = parseFunction('sum(http_requests_total) by (job, instance, status)');

      expect(func.grouping).toBeDefined();
      expect(func.grouping?.name).toBe('by');
      expect(func.grouping?.labels).toHaveLength(3);
      expect(func.grouping?.labels[0].name).toBe('job');
      expect(func.grouping?.labels[1].name).toBe('instance');
      expect(func.grouping?.labels[2].name).toBe('status');
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

    it('irate() has no grouping', () => {
      const func = parseFunction('irate(http_requests_total[5m])');

      expect(func.grouping).toBeUndefined();
      expect(func.groupingPosition).toBeUndefined();
    });

    it('histogram_quantile() has no grouping', () => {
      const func = parseFunction('histogram_quantile(0.9, rate(http_request_duration_bucket[5m]))');

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
      const func = parseFunction('min(http_requests_total)');

      expect(func.name).toBe('min');
    });

    it('parses max aggregation', () => {
      const func = parseFunction('max(http_requests_total)');

      expect(func.name).toBe('max');
    });

    it('parses avg aggregation', () => {
      const func = parseFunction('avg(http_requests_total)');

      expect(func.name).toBe('avg');
    });

    it('parses count aggregation', () => {
      const func = parseFunction('count(http_requests_total)');

      expect(func.name).toBe('count');
    });

    it('parses stddev aggregation', () => {
      const func = parseFunction('stddev(http_requests_total)');

      expect(func.name).toBe('stddev');
    });

    it('parses stdvar aggregation', () => {
      const func = parseFunction('stdvar(http_requests_total)');

      expect(func.name).toBe('stdvar');
    });

    it('parses topk aggregation', () => {
      const func = parseFunction('topk(5, http_requests_total)');

      expect(func.name).toBe('topk');
      expect(func.args).toHaveLength(2);
    });

    it('parses bottomk aggregation', () => {
      const func = parseFunction('bottomk(3, http_requests_total)');

      expect(func.name).toBe('bottomk');
      expect(func.args).toHaveLength(2);
    });

    it('parses count_values aggregation', () => {
      const func = parseFunction('count_values("version", build_info)');

      expect(func.name).toBe('count_values');
      expect(func.args).toHaveLength(2);
    });

    it('parses quantile aggregation', () => {
      const func = parseFunction('quantile(0.5, http_request_duration_seconds)');

      expect(func.name).toBe('quantile');
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
      const func = parseFunction('irate(http_requests_total[5m])');

      expect(func.name).toBe('irate');
    });

    it('parses increase function', () => {
      const func = parseFunction('increase(http_requests_total[1h])');

      expect(func.name).toBe('increase');
    });

    it('parses delta function', () => {
      const func = parseFunction('delta(cpu_temp_celsius[2h])');

      expect(func.name).toBe('delta');
    });

    it('parses deriv function', () => {
      const func = parseFunction('deriv(cpu_temp_celsius[30m])');

      expect(func.name).toBe('deriv');
    });

    it('parses predict_linear function', () => {
      const func = parseFunction('predict_linear(node_filesystem_free_bytes[1h], 4*3600)');

      expect(func.name).toBe('predict_linear');
      expect(func.args).toHaveLength(2);
    });

    it('parses changes function', () => {
      const func = parseFunction('changes(process_start_time_seconds[1h])');

      expect(func.name).toBe('changes');
    });

    it('parses resets function', () => {
      const func = parseFunction('resets(http_requests_total[1h])');

      expect(func.name).toBe('resets');
    });
  });

  describe('other functions', () => {
    it('parses abs function', () => {
      const func = parseFunction('abs(http_requests_total)');

      expect(func.name).toBe('abs');
    });

    it('parses ceil function', () => {
      const func = parseFunction('ceil(http_requests_total)');

      expect(func.name).toBe('ceil');
    });

    it('parses floor function', () => {
      const func = parseFunction('floor(http_requests_total)');

      expect(func.name).toBe('floor');
    });

    it('parses round function', () => {
      const func = parseFunction('round(http_requests_total)');

      expect(func.name).toBe('round');
    });

    it('parses round with precision', () => {
      const func = parseFunction('round(http_requests_total, 0.1)');

      expect(func.name).toBe('round');
      expect(func.args).toHaveLength(2);
    });

    it('parses clamp function', () => {
      const func = parseFunction('clamp(http_requests_total, 0, 100)');

      expect(func.name).toBe('clamp');
      expect(func.args).toHaveLength(3);
    });

    it('parses clamp_min function', () => {
      const func = parseFunction('clamp_min(http_requests_total, 0)');

      expect(func.name).toBe('clamp_min');
      expect(func.args).toHaveLength(2);
    });

    it('parses clamp_max function', () => {
      const func = parseFunction('clamp_max(http_requests_total, 100)');

      expect(func.name).toBe('clamp_max');
      expect(func.args).toHaveLength(2);
    });

    it('parses label_replace function', () => {
      const func = parseFunction('label_replace(up, "host", "$1", "instance", "(.*):.*")');

      expect(func.name).toBe('label_replace');
      expect(func.args).toHaveLength(5);
    });

    it('parses label_join function', () => {
      const func = parseFunction('label_join(up, "new_label", "-", "job", "instance")');

      expect(func.name).toBe('label_join');
      expect(func.args).toHaveLength(5);
    });

    it('parses vector function', () => {
      const func = parseFunction('vector(1)');

      expect(func.name).toBe('vector');
      expect(func.args).toHaveLength(1);
    });

    it('parses scalar function', () => {
      const func = parseFunction('scalar(sum(http_requests_total))');

      expect(func.name).toBe('scalar');
      expect(func.args).toHaveLength(1);
    });

    it('parses sort function', () => {
      const func = parseFunction('sort(http_requests_total)');

      expect(func.name).toBe('sort');
    });

    it('parses sort_desc function', () => {
      const func = parseFunction('sort_desc(http_requests_total)');

      expect(func.name).toBe('sort_desc');
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
      expect(selector.labels).toHaveLength(2);
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
      const func = parseFunction('sum(http_requests_total)');

      expect(func.location).toBeDefined();
      expect(func.location.min).toBe(0);
      expect(func.location.max).toBeGreaterThan(0);
    });

    it('tracks text content correctly', () => {
      const query = 'sum(http_requests_total)';
      const func = parseFunction(query);

      expect(func.text).toBe(query);
    });

    it('grouping has its own location', () => {
      const func = parseFunction('sum by (job) (http_requests_total)');

      expect(func.grouping).toBeDefined();
      expect(func.grouping?.location).toBeDefined();
      expect(func.grouping?.text).toContain('by');
    });
  });
});
