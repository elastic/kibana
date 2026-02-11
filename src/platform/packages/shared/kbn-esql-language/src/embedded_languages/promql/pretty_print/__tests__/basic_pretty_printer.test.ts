/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../../parser';
import {
  PromQLBasicPrettyPrinter,
  type PromQLBasicPrettyPrinterOptions,
} from '../basic_pretty_printer';

const reprint = (src: string, opts?: PromQLBasicPrettyPrinterOptions) => {
  const result = PromQLParser.parse(src);
  if (result.errors.length > 0) {
    throw new Error(`Parse error: ${result.errors[0].message}`);
  }
  return PromQLBasicPrettyPrinter.print(result.root, opts);
};

const assertReprint = (src: string, expected: string = src) => {
  const text = reprint(src);
  expect(text).toBe(expected);
};

describe('parsed PromQL BasicPrettyPrinter', () => {
  describe('selectors', () => {
    describe('instant vector selectors', () => {
      test('simple metric name', () => {
        assertReprint('http_requests_total');
      });

      test('metric with single label', () => {
        assertReprint('http_requests_total{job="api"}');
      });

      test('metric with multiple labels', () => {
        assertReprint('http_requests_total{job="api", status="200"}');
      });

      test('metric with regex label matcher', () => {
        assertReprint('http_requests_total{status=~"5.."}');
      });

      test('metric with negative label matcher', () => {
        assertReprint('http_requests_total{job!="api"}');
      });

      test('metric with negative regex matcher', () => {
        assertReprint('http_requests_total{status!~"2.."}');
      });

      test('label-only selector', () => {
        assertReprint('{job="api"}');
      });

      test('multiple label matchers', () => {
        assertReprint('{job="api", instance=~"localhost:.*", status!="error"}');
      });
    });

    describe('range vector selectors', () => {
      test('simple range selector', () => {
        assertReprint('http_requests_total[5m]');
      });

      test('range selector with labels', () => {
        assertReprint('http_requests_total{job="api"}[5m]');
      });

      test('range selector with complex duration', () => {
        assertReprint('http_requests_total[1h30m]');
      });
    });

    describe('offset modifier', () => {
      test('instant vector with offset', () => {
        assertReprint('http_requests_total offset 5m');
      });

      test('range vector with offset', () => {
        assertReprint('http_requests_total[5m] offset 1h');
      });

      test('negative offset', () => {
        assertReprint('http_requests_total offset - 5m');
      });
    });

    describe('@ modifier', () => {
      test('instant vector with @ timestamp', () => {
        assertReprint('http_requests_total @ 1609459200');
      });

      test('@ with start()', () => {
        assertReprint('http_requests_total @ start()');
      });

      test('@ with end()', () => {
        assertReprint('http_requests_total @ end()');
      });

      test('combined offset and @', () => {
        assertReprint('http_requests_total offset 5m @ 1609459200');
      });
    });
  });

  describe('literals', () => {
    describe('numeric literals', () => {
      test('integer', () => {
        assertReprint('42');
      });

      test('negative integer', () => {
        assertReprint('-42');
      });

      test('decimal', () => {
        assertReprint('3.14');
      });

      test('decimal with exponent', () => {
        const text = reprint('1.5e3');
        expect(parseFloat(text)).toBe(1500);
      });

      test('hexadecimal', () => {
        assertReprint('0xff', '0xff');
      });
    });

    describe('string literals', () => {
      test('double-quoted string', () => {
        assertReprint('"hello world"');
      });

      test('single-quoted string', () => {
        assertReprint("'hello world'");
      });
    });

    describe('special values', () => {
      test('Inf', () => {
        assertReprint('Inf');
      });

      test('NaN', () => {
        assertReprint('NaN');
      });
    });
  });

  describe('binary expressions', () => {
    describe('arithmetic operators', () => {
      test('addition', () => {
        assertReprint('a + b');
      });

      test('subtraction', () => {
        assertReprint('a - b');
      });

      test('multiplication', () => {
        assertReprint('a * b');
      });

      test('division', () => {
        assertReprint('a / b');
      });

      test('modulo', () => {
        assertReprint('a % b');
      });

      test('power', () => {
        assertReprint('a ^ b');
      });
    });

    describe('comparison operators', () => {
      test('equal', () => {
        assertReprint('a == b');
      });

      test('not equal', () => {
        assertReprint('a != b');
      });

      test('greater than', () => {
        assertReprint('a > b');
      });

      test('greater than or equal', () => {
        assertReprint('a >= b');
      });

      test('less than', () => {
        assertReprint('a < b');
      });

      test('less than or equal', () => {
        assertReprint('a <= b');
      });

      test('comparison with bool modifier', () => {
        assertReprint('a > bool b');
      });

      test('comparison with bool and numeric', () => {
        assertReprint('http_requests_total > bool 100');
      });
    });

    describe('set operators', () => {
      test('and', () => {
        assertReprint('a and b');
      });

      test('or', () => {
        assertReprint('a or b');
      });

      test('unless', () => {
        assertReprint('a unless b');
      });
    });

    describe('vector matching', () => {
      test('on modifier', () => {
        assertReprint('a / on(job) b');
      });

      test('ignoring modifier', () => {
        assertReprint('a / ignoring(instance) b');
      });

      test('on with multiple labels', () => {
        assertReprint('a / on(job, instance) b');
      });

      test('group_left', () => {
        assertReprint('a * on(job) group_left b');
      });

      test('group_left with labels', () => {
        assertReprint('a * on(job) group_left(instance) b');
      });

      test('group_right', () => {
        assertReprint('a * on(job) group_right b');
      });

      test('group_right with labels', () => {
        assertReprint('a * ignoring(job) group_right(instance, version) b');
      });
    });

    describe('complex binary expressions', () => {
      test('chained arithmetic', () => {
        assertReprint('a + b + c');
      });

      test('mixed operators', () => {
        assertReprint('a + b * c');
      });

      test('with selectors', () => {
        assertReprint('http_requests_total / http_requests_failed');
      });
    });
  });

  describe('unary expressions', () => {
    test('negative', () => {
      assertReprint('-http_requests_total');
    });

    test('positive', () => {
      assertReprint('+http_requests_total');
    });

    test('double negative', () => {
      assertReprint('--http_requests_total');
    });
  });

  describe('parenthesized expressions', () => {
    test('simple parens', () => {
      assertReprint('(a)');
    });

    test('parens with binary expression', () => {
      assertReprint('(a + b)');
    });

    test('nested parens', () => {
      assertReprint('((a + b))');
    });

    test('parens for precedence', () => {
      assertReprint('(a + b) * c');
    });
  });

  describe('function calls', () => {
    describe('basic functions', () => {
      test('no argument function', () => {
        assertReprint('time()');
      });

      test('single argument function', () => {
        assertReprint('abs(http_requests_total)');
      });

      test('multiple argument function', () => {
        assertReprint('clamp(http_requests_total, 0, 100)');
      });
    });

    describe('rate functions', () => {
      test('rate', () => {
        assertReprint('rate(http_requests_total[5m])');
      });

      test('irate', () => {
        assertReprint('irate(http_requests_total[5m])');
      });

      test('increase', () => {
        assertReprint('increase(http_requests_total[1h])');
      });

      test('delta', () => {
        assertReprint('delta(cpu_temp[2h])');
      });
    });

    describe('aggregation functions', () => {
      test('sum', () => {
        assertReprint('sum(http_requests_total)');
      });

      test('avg', () => {
        assertReprint('avg(http_requests_total)');
      });

      test('min', () => {
        assertReprint('min(http_requests_total)');
      });

      test('max', () => {
        assertReprint('max(http_requests_total)');
      });

      test('count', () => {
        assertReprint('count(http_requests_total)');
      });

      test('stddev', () => {
        assertReprint('stddev(http_requests_total)');
      });

      test('stdvar', () => {
        assertReprint('stdvar(http_requests_total)');
      });

      test('topk', () => {
        assertReprint('topk(5, http_requests_total)');
      });

      test('bottomk', () => {
        assertReprint('bottomk(3, http_requests_total)');
      });

      test('quantile', () => {
        assertReprint('quantile(0.9, http_requests_total)');
      });

      test('count_values', () => {
        assertReprint('count_values("version", build_info)');
      });
    });

    describe('grouping - before args', () => {
      test('sum by', () => {
        assertReprint('sum by (job) (http_requests_total)');
      });

      test('avg without', () => {
        assertReprint('avg without (instance) (http_requests_total)');
      });

      test('multiple labels', () => {
        assertReprint('sum by (job, instance) (http_requests_total)');
      });
    });

    describe('grouping - after args', () => {
      test('sum by after', () => {
        assertReprint('sum(http_requests_total) by (job)');
      });

      test('avg without after', () => {
        assertReprint('avg(http_requests_total) without (instance)');
      });

      test('multiple labels after', () => {
        assertReprint('sum(http_requests_total) by (job, instance)');
      });
    });

    describe('nested functions', () => {
      test('rate inside sum', () => {
        assertReprint('sum(rate(http_requests_total[5m]))');
      });

      test('deeply nested', () => {
        assertReprint('sum(rate(increase(http_requests_total[1m])[5m:1m]))');
      });

      test('aggregation with grouping and nested rate', () => {
        assertReprint('sum(rate(http_requests_total[5m])) by (job)');
      });

      test('histogram_quantile', () => {
        assertReprint('histogram_quantile(0.9, rate(http_request_duration_bucket[5m]))');
      });
    });

    describe('other functions', () => {
      test('label_replace', () => {
        assertReprint('label_replace(up, "host", "$1", "instance", "(.*):.*")');
      });

      test('label_join', () => {
        assertReprint('label_join(up, "new_label", "-", "job", "instance")');
      });

      test('vector', () => {
        assertReprint('vector(1)');
      });

      test('scalar', () => {
        assertReprint('scalar(sum(http_requests_total))');
      });

      test('sort', () => {
        assertReprint('sort(http_requests_total)');
      });

      test('sort_desc', () => {
        assertReprint('sort_desc(http_requests_total)');
      });

      test('predict_linear', () => {
        assertReprint('predict_linear(http_requests_total[1h], 3600)');
      });
    });
  });

  describe('subqueries', () => {
    test('simple subquery', () => {
      assertReprint('http_requests_total[30m:5m]');
    });

    test('subquery with default resolution', () => {
      assertReprint('http_requests_total[30m:]');
    });

    test('subquery on function result', () => {
      assertReprint('rate(http_requests_total[5m])[30m:1m]');
    });

    test('subquery with offset', () => {
      assertReprint('rate(http_requests_total[5m])[30m:1m] offset 1h');
    });
  });

  describe('complex queries', () => {
    test('error rate calculation', () => {
      assertReprint(
        'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))'
      );
    });

    test('p99 latency', () => {
      assertReprint(
        'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
      );
    });

    test('rate with labels and grouping', () => {
      assertReprint('sum by (job, instance) (rate(http_requests_total{status="200"}[5m]))');
    });

    test('complex vector matching', () => {
      assertReprint(
        'http_requests_total{job="api"} / on(job, instance) group_left(version) build_info'
      );
    });

    test('comparison with threshold', () => {
      assertReprint('sum(rate(http_requests_total[5m])) > bool 100');
    });
  });

  describe('static methods', () => {
    test('print() works with query expression', () => {
      const result = PromQLParser.parse('sum(rate(http_requests_total[5m]))');
      const text = PromQLBasicPrettyPrinter.print(result.root);
      expect(text).toBe('sum(rate(http_requests_total[5m]))');
    });

    test('query() works', () => {
      const result = PromQLParser.parse('sum(http_requests_total)');
      const text = PromQLBasicPrettyPrinter.query(result.root);
      expect(text).toBe('sum(http_requests_total)');
    });

    test('expression() works', () => {
      const result = PromQLParser.parse('sum(http_requests_total)');
      const text = PromQLBasicPrettyPrinter.expression(result.root.expression!);
      expect(text).toBe('sum(http_requests_total)');
    });
  });

  describe('options', () => {
    test('lowercaseFunctions option', () => {
      const text = reprint('SUM(HTTP_REQUESTS_TOTAL)', { lowercaseFunctions: true });
      expect(text).toBe('sum(HTTP_REQUESTS_TOTAL)');
    });

    test('combined options', () => {
      // PromQL uses lowercase operators by default
      const text = reprint('SUM(a) and AVG(b)', {
        lowercaseFunctions: true,
        lowercaseOperators: true,
      });
      expect(text).toBe('sum(a) and avg(b)');
    });
  });

  describe('edge cases', () => {
    test('preserves metric name case', () => {
      assertReprint('HTTP_Requests_Total');
    });

    test('preserves label name case', () => {
      assertReprint('http_requests_total{Job="api"}');
    });
  });
});
