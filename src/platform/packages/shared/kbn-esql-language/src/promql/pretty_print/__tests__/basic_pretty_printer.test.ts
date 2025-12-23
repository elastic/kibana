/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../../parser';
import { PromQLBuilder } from '../../builder';
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

describe('PromQL BasicPrettyPrinter', () => {
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

  describe('synthetic AST (Builder-constructed)', () => {
    describe('literals', () => {
      test('integer literal', () => {
        const node = PromQLBuilder.expression.literal.integer(42);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('42');
      });

      test('negative integer literal', () => {
        const node = PromQLBuilder.expression.literal.integer(-123);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('-123');
      });

      test('decimal literal', () => {
        const node = PromQLBuilder.expression.literal.decimal(3.14);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('3.14');
      });

      test('decimal literal with whole number renders with decimal point', () => {
        const node = PromQLBuilder.expression.literal.decimal(5);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('5.0');
      });

      test('hexadecimal literal', () => {
        const node = PromQLBuilder.expression.literal.hexadecimal(255, '0xff');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('0xff');
      });

      test('string literal', () => {
        const node = PromQLBuilder.expression.literal.string('hello');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('"hello"');
      });

      test('string literal with special characters', () => {
        const node = PromQLBuilder.expression.literal.string('hello\nworld');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('"hello\\nworld"');
      });

      test('string literal with quotes', () => {
        const node = PromQLBuilder.expression.literal.string('say "hello"');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('"say \\"hello\\""');
      });

      test('string literal with backslash', () => {
        const node = PromQLBuilder.expression.literal.string('path\\to\\file');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('"path\\\\to\\\\file"');
      });

      test('time literal', () => {
        const node = PromQLBuilder.expression.literal.time('5m');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('5m');
      });

      test('complex time literal', () => {
        const node = PromQLBuilder.expression.literal.time('1h30m');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('1h30m');
      });
    });

    describe('identifiers', () => {
      test('simple identifier', () => {
        const node = PromQLBuilder.identifier('http_requests_total');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('http_requests_total');
      });

      test('identifier with uppercase', () => {
        const node = PromQLBuilder.identifier('HTTP_Requests');
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('HTTP_Requests');
      });
    });

    describe('selectors', () => {
      test('metric-only selector', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe('http_requests_total');
      });

      test('selector with labels', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const labelName = PromQLBuilder.identifier('job');
        const labelValue = PromQLBuilder.expression.literal.string('api');
        const label = PromQLBuilder.label(labelName, '=', labelValue);
        const labelMap = PromQLBuilder.labelMap([label]);
        const selector = PromQLBuilder.expression.selector.node({ metric, labelMap });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe(
          'http_requests_total{job="api"}'
        );
      });

      test('selector with multiple labels', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const label1 = PromQLBuilder.label(
          PromQLBuilder.identifier('job'),
          '=',
          PromQLBuilder.expression.literal.string('api')
        );
        const label2 = PromQLBuilder.label(
          PromQLBuilder.identifier('status'),
          '=~',
          PromQLBuilder.expression.literal.string('5..')
        );
        const labelMap = PromQLBuilder.labelMap([label1, label2]);
        const selector = PromQLBuilder.expression.selector.node({ metric, labelMap });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe(
          'http_requests_total{job="api", status=~"5.."}'
        );
      });

      test('label-only selector', () => {
        const label = PromQLBuilder.label(
          PromQLBuilder.identifier('job'),
          '=',
          PromQLBuilder.expression.literal.string('api')
        );
        const labelMap = PromQLBuilder.labelMap([label]);
        const selector = PromQLBuilder.expression.selector.node({ labelMap });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe('{job="api"}');
      });

      test('range vector selector', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const duration = PromQLBuilder.expression.literal.time('5m');
        const selector = PromQLBuilder.expression.selector.node({ metric, duration });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe('http_requests_total[5m]');
      });

      test('selector with offset', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const duration = PromQLBuilder.expression.literal.time('5m');
        const offset = PromQLBuilder.offset(duration, false);
        const evaluation = PromQLBuilder.evaluation(offset);
        const selector = PromQLBuilder.expression.selector.node({ metric, evaluation });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe('http_requests_total offset 5m');
      });

      test('selector with negative offset', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const duration = PromQLBuilder.expression.literal.time('5m');
        const offset = PromQLBuilder.offset(duration, true);
        const evaluation = PromQLBuilder.evaluation(offset);
        const selector = PromQLBuilder.expression.selector.node({ metric, evaluation });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe(
          'http_requests_total offset - 5m'
        );
      });

      test('selector with @ modifier', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const timestamp = PromQLBuilder.expression.literal.time('1609459200');
        const at = PromQLBuilder.at(timestamp, false);
        const evaluation = PromQLBuilder.evaluation(undefined, at);
        const selector = PromQLBuilder.expression.selector.node({ metric, evaluation });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe(
          'http_requests_total @ 1609459200'
        );
      });

      test('selector with @ start()', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const at = PromQLBuilder.at('start()', false);
        const evaluation = PromQLBuilder.evaluation(undefined, at);
        const selector = PromQLBuilder.expression.selector.node({ metric, evaluation });
        expect(PromQLBasicPrettyPrinter.expression(selector)).toBe('http_requests_total @ start()');
      });
    });

    describe('functions', () => {
      test('function without arguments', () => {
        const func = PromQLBuilder.expression.func.call('time', []);
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe('time()');
      });

      test('function with single argument', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const func = PromQLBuilder.expression.func.call('abs', [selector]);
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe('abs(http_requests_total)');
      });

      test('rate function with range vector', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const duration = PromQLBuilder.expression.literal.time('5m');
        const selector = PromQLBuilder.expression.selector.node({ metric, duration });
        const func = PromQLBuilder.expression.func.call('rate', [selector]);
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe('rate(http_requests_total[5m])');
      });

      test('aggregation with by grouping (before args)', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const grouping = PromQLBuilder.grouping('by', [PromQLBuilder.identifier('job')]);
        const func = PromQLBuilder.expression.func.call('sum', [selector], grouping, 'before');
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe(
          'sum by (job) (http_requests_total)'
        );
      });

      test('aggregation with by grouping (after args)', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const grouping = PromQLBuilder.grouping('by', [PromQLBuilder.identifier('job')]);
        const func = PromQLBuilder.expression.func.call('sum', [selector], grouping, 'after');
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe('sum(http_requests_total) by (job)');
      });

      test('aggregation with without grouping', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const grouping = PromQLBuilder.grouping('without', [PromQLBuilder.identifier('instance')]);
        const func = PromQLBuilder.expression.func.call('avg', [selector], grouping, 'after');
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe(
          'avg(http_requests_total) without (instance)'
        );
      });

      test('function with multiple arguments', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const min = PromQLBuilder.expression.literal.integer(0);
        const max = PromQLBuilder.expression.literal.integer(100);
        const func = PromQLBuilder.expression.func.call('clamp', [selector, min, max]);
        expect(PromQLBasicPrettyPrinter.expression(func)).toBe(
          'clamp(http_requests_total, 0, 100)'
        );
      });

      test('nested functions', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const duration = PromQLBuilder.expression.literal.time('5m');
        const selector = PromQLBuilder.expression.selector.node({ metric, duration });
        const rate = PromQLBuilder.expression.func.call('rate', [selector]);
        const sum = PromQLBuilder.expression.func.call('sum', [rate]);
        expect(PromQLBasicPrettyPrinter.expression(sum)).toBe('sum(rate(http_requests_total[5m]))');
      });
    });

    describe('binary expressions', () => {
      test('addition', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const binary = PromQLBuilder.expression.binary('+', leftSelector, rightSelector);
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a + b');
      });

      test('comparison with bool modifier', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const binary = PromQLBuilder.expression.binary('>', leftSelector, rightSelector, {
          bool: true,
        });
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a > bool b');
      });

      test('binary with on modifier', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const modifier = PromQLBuilder.modifier('on', [PromQLBuilder.identifier('job')]);
        const binary = PromQLBuilder.expression.binary('/', leftSelector, rightSelector, {
          modifier,
        });
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a / on(job) b');
      });

      test('binary with ignoring modifier', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const modifier = PromQLBuilder.modifier('ignoring', [PromQLBuilder.identifier('instance')]);
        const binary = PromQLBuilder.expression.binary('*', leftSelector, rightSelector, {
          modifier,
        });
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a * ignoring(instance) b');
      });

      test('binary with group_left modifier', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const groupMod = PromQLBuilder.groupModifier('group_left', [
          PromQLBuilder.identifier('version'),
        ]);
        const modifier = PromQLBuilder.modifier('on', [PromQLBuilder.identifier('job')], groupMod);
        const binary = PromQLBuilder.expression.binary('*', leftSelector, rightSelector, {
          modifier,
        });
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe(
          'a * on(job) group_left(version) b'
        );
      });

      test('set operator: and', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const binary = PromQLBuilder.expression.binary('and', leftSelector, rightSelector);
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a and b');
      });

      test('set operator: or', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const binary = PromQLBuilder.expression.binary('or', leftSelector, rightSelector);
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a or b');
      });

      test('set operator: unless', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const binary = PromQLBuilder.expression.binary('unless', leftSelector, rightSelector);
        expect(PromQLBasicPrettyPrinter.expression(binary)).toBe('a unless b');
      });
    });

    describe('unary expressions', () => {
      test('negative', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const unary = PromQLBuilder.expression.unary('-', selector);
        expect(PromQLBasicPrettyPrinter.expression(unary)).toBe('-http_requests_total');
      });

      test('positive', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const unary = PromQLBuilder.expression.unary('+', selector);
        expect(PromQLBasicPrettyPrinter.expression(unary)).toBe('+http_requests_total');
      });
    });

    describe('parenthesized expressions', () => {
      test('simple parens', () => {
        const metric = PromQLBuilder.identifier('a');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const parens = PromQLBuilder.expression.parens(selector);
        expect(PromQLBasicPrettyPrinter.expression(parens)).toBe('(a)');
      });

      test('parens around binary expression', () => {
        const left = PromQLBuilder.identifier('a');
        const leftSelector = PromQLBuilder.expression.selector.node({ metric: left });
        const right = PromQLBuilder.identifier('b');
        const rightSelector = PromQLBuilder.expression.selector.node({ metric: right });
        const binary = PromQLBuilder.expression.binary('+', leftSelector, rightSelector);
        const parens = PromQLBuilder.expression.parens(binary);
        expect(PromQLBasicPrettyPrinter.expression(parens)).toBe('(a + b)');
      });
    });

    describe('subqueries', () => {
      test('simple subquery', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const range = PromQLBuilder.expression.literal.time('30m');
        const resolution = PromQLBuilder.expression.literal.time('5m');
        const subquery = PromQLBuilder.expression.subquery(selector, range, resolution);
        expect(PromQLBasicPrettyPrinter.expression(subquery)).toBe('http_requests_total[30m:5m]');
      });

      test('subquery with default resolution', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const range = PromQLBuilder.expression.literal.time('30m');
        const subquery = PromQLBuilder.expression.subquery(selector, range, undefined);
        expect(PromQLBasicPrettyPrinter.expression(subquery)).toBe('http_requests_total[30m:]');
      });

      test('subquery on function result', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const duration = PromQLBuilder.expression.literal.time('5m');
        const selector = PromQLBuilder.expression.selector.node({ metric, duration });
        const rate = PromQLBuilder.expression.func.call('rate', [selector]);
        const range = PromQLBuilder.expression.literal.time('30m');
        const resolution = PromQLBuilder.expression.literal.time('1m');
        const subquery = PromQLBuilder.expression.subquery(rate, range, resolution);
        expect(PromQLBasicPrettyPrinter.expression(subquery)).toBe(
          'rate(http_requests_total[5m])[30m:1m]'
        );
      });

      test('subquery with offset', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const range = PromQLBuilder.expression.literal.time('30m');
        const resolution = PromQLBuilder.expression.literal.time('5m');
        const offsetDuration = PromQLBuilder.expression.literal.time('1h');
        const offset = PromQLBuilder.offset(offsetDuration);
        const evaluation = PromQLBuilder.evaluation(offset);
        const subquery = PromQLBuilder.expression.subquery(selector, range, resolution, evaluation);
        expect(PromQLBasicPrettyPrinter.expression(subquery)).toBe(
          'http_requests_total[30m:5m] offset 1h'
        );
      });
    });

    describe('query expressions', () => {
      test('query with expression', () => {
        const metric = PromQLBuilder.identifier('http_requests_total');
        const selector = PromQLBuilder.expression.selector.node({ metric });
        const query = PromQLBuilder.expression.query(selector);
        expect(PromQLBasicPrettyPrinter.print(query)).toBe('http_requests_total');
      });

      test('query without expression returns empty string', () => {
        const query = PromQLBuilder.expression.query(undefined);
        expect(PromQLBasicPrettyPrinter.print(query)).toBe('');
      });
    });

    describe('special cases', () => {
      test('unknown node', () => {
        const unknown = PromQLBuilder.unknown();
        expect(PromQLBasicPrettyPrinter.expression(unknown)).toBe('<unknown>');
      });

      test('special decimal values - NaN', () => {
        const node = PromQLBuilder.expression.literal.decimal(NaN);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('NaN');
      });

      test('special decimal values - Infinity', () => {
        const node = PromQLBuilder.expression.literal.decimal(Infinity);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('Inf');
      });

      test('special decimal values - negative Infinity', () => {
        const node = PromQLBuilder.expression.literal.decimal(-Infinity);
        expect(PromQLBasicPrettyPrinter.expression(node)).toBe('-Inf');
      });
    });
  });
});
