/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromKueryExpression,
  fromLiteralExpression,
  toElasticsearchQuery,
  toKqlExpression,
} from './ast';
import { nodeTypes } from '../node_types';
import type { DataViewBase } from '../../..';
import type { KueryNode } from '../types';
import { fields } from '../../filters/stubs';

describe('kuery AST API', () => {
  let indexPattern: DataViewBase;

  beforeEach(() => {
    indexPattern = {
      fields,
      title: 'dataView',
    };
  });

  describe('fromKueryExpression', () => {
    test('should return a match all "is" function for whitespace', () => {
      const expected = nodeTypes.function.buildNode('is', '*', '*');
      const actual = fromKueryExpression('  ');
      expect(actual).toEqual(expected);
    });

    test('should return an "is" function with a null field for single literals', () => {
      const expected = nodeTypes.function.buildNode('is', null, 'foo');
      const actual = fromKueryExpression('foo');
      expect(actual).toEqual(expected);
    });

    test('should ignore extraneous whitespace at the beginning and end of the query', () => {
      const expected = nodeTypes.function.buildNode('is', null, 'foo');
      const actual = fromKueryExpression('  foo ');
      expect(actual).toEqual(expected);
    });

    test('should not split on whitespace', () => {
      const expected = nodeTypes.function.buildNode('is', null, 'foo bar');
      const actual = fromKueryExpression('foo bar');
      expect(actual).toEqual(expected);
    });

    test('should support "and" as a binary operator', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
      ]);
      const actual = fromKueryExpression('foo and bar');
      expect(actual).toEqual(expected);
    });

    test('should support spaces before & after "and"', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
      ]);
      const actual = fromKueryExpression('foo    and    bar');
      expect(actual).toEqual(expected);
    });

    test('should support spaces before & after "or"', () => {
      const withSingleSpaces = fromKueryExpression('foo or bar');
      expect(fromKueryExpression('foo      or      bar')).toEqual(withSingleSpaces);
    });

    test('should support spaces after "not"', () => {
      const withSingleSpaces = fromKueryExpression('not foo');
      expect(fromKueryExpression('not      foo')).toEqual(withSingleSpaces);
    });

    test('should normalize extra spaces around "and" for field:value followed by another clause', () => {
      const withSingleSpaces = fromKueryExpression('host:foo and bar');
      expect(fromKueryExpression('host:foo    and    bar')).toEqual(withSingleSpaces);
    });

    test('should normalize extra spaces around "or" inside field:(...) value lists', () => {
      const withSingleSpaces = fromKueryExpression('host:(bar or baz)');
      expect(fromKueryExpression('host:(bar      or      baz)')).toEqual(withSingleSpaces);
    });

    test('should normalize extra spaces around "and" between range comparisons', () => {
      const withSingleSpaces = fromKueryExpression('bytes > 1000 and bytes < 8000');
      expect(fromKueryExpression('bytes > 1000    and    bytes < 8000')).toEqual(withSingleSpaces);
    });

    test('should normalize extra spaces around "and" when left operand is parenthesized', () => {
      const withSingleSpaces = fromKueryExpression('(foo) and bar');
      expect(fromKueryExpression('(foo)    and    bar')).toEqual(withSingleSpaces);
    });

    test('should normalize extra spaces around "and" when left operand is quoted', () => {
      const withSingleSpaces = fromKueryExpression('"foo" and bar');
      expect(fromKueryExpression('"foo"    and    bar')).toEqual(withSingleSpaces);
    });

    test('nbsp should be recognised as whitespace', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
      ]);
      const actual = fromKueryExpression('foo and\u00A0bar');
      expect(actual).toEqual(expected);
    });

    test('should support "or" as a binary operator', () => {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
      ]);
      const actual = fromKueryExpression('foo or bar');
      expect(actual).toEqual(expected);
    });

    test('should not nest same-level "and"', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
        nodeTypes.function.buildNode('is', null, 'baz'),
      ]);
      const actual = fromKueryExpression('foo and bar and baz');
      expect(actual).toEqual(expected);
    });

    test('should not nest same-level "or"', () => {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
        nodeTypes.function.buildNode('is', null, 'baz'),
      ]);
      const actual = fromKueryExpression('foo or bar or baz');
      expect(actual).toEqual(expected);
    });

    test('should support negation of queries with a "not" prefix', () => {
      const expected = nodeTypes.function.buildNode(
        'not',
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('is', null, 'foo'),
          nodeTypes.function.buildNode('is', null, 'bar'),
        ])
      );
      const actual = fromKueryExpression('not (foo or bar)');
      expect(actual).toEqual(expected);
    });

    test('"and" should have a higher precedence than "or"', () => {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('and', [
          nodeTypes.function.buildNode('is', null, 'bar'),
          nodeTypes.function.buildNode('is', null, 'baz'),
        ]),
        nodeTypes.function.buildNode('is', null, 'qux'),
      ]);
      const actual = fromKueryExpression('foo or bar and baz or qux');
      expect(actual).toEqual(expected);
    });

    test('should support grouping to override default precedence', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('is', null, 'foo'),
          nodeTypes.function.buildNode('is', null, 'bar'),
        ]),
        nodeTypes.function.buildNode('is', null, 'baz'),
      ]);
      const actual = fromKueryExpression('(foo or bar) and baz');
      expect(actual).toEqual(expected);
    });

    test('should support matching against specific fields', () => {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar');
      const actual = fromKueryExpression('foo:bar');
      expect(actual).toEqual(expected);
    });

    test('should also not split on whitespace when matching specific fields', () => {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar baz');
      const actual = fromKueryExpression('foo:bar baz');
      expect(actual).toEqual(expected);
    });

    test('should treat quoted values as phrases', () => {
      const expected = nodeTypes.function.buildNode('is', 'foo', '"bar baz"');
      const actual = fromKueryExpression('foo:"bar baz"');
      expect(actual).toEqual(expected);
    });

    test('should support a shorthand for matching multiple values against a single field', () => {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', 'foo', 'bar'),
        nodeTypes.function.buildNode('is', 'foo', 'baz'),
      ]);
      const actual = fromKueryExpression('foo:(bar or baz)');
      expect(actual).toEqual(expected);
    });

    test('should support "and" and "not" operators and grouping in the shorthand as well', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('is', 'foo', 'bar'),
          nodeTypes.function.buildNode('is', 'foo', 'baz'),
        ]),
        nodeTypes.function.buildNode('not', nodeTypes.function.buildNode('is', 'foo', 'qux')),
      ]);
      const actual = fromKueryExpression('foo:((bar or baz) and not qux)');
      expect(actual).toEqual(expected);
    });

    test('should support exclusive range operators', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('range', 'bytes', 'gt', '1000'),
        nodeTypes.function.buildNode('range', 'bytes', 'lt', '8000'),
      ]);
      const actual = fromKueryExpression('bytes > 1000 and bytes < 8000');
      expect(actual).toEqual(expected);
    });

    test('should support inclusive range operators', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('range', 'bytes', 'gte', '1000'),
        nodeTypes.function.buildNode('range', 'bytes', 'lte', '8000'),
      ]);
      const actual = fromKueryExpression('bytes >= 1000 and bytes <= 8000');
      expect(actual).toEqual(expected);
    });

    test('should support wildcards in field names', () => {
      const expected = nodeTypes.function.buildNode('is', 'machine*', 'osx');
      const actual = fromKueryExpression('machine*:osx');
      expect(actual).toEqual(expected);
    });

    test('should support wildcards in values', () => {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'ba*');
      const actual = fromKueryExpression('foo:ba*');
      expect(actual).toEqual(expected);
    });

    test('should create an exists "is" query when a field is given and "*" is the value', () => {
      const expected = nodeTypes.function.buildNode('is', 'foo', '*');
      const actual = fromKueryExpression('foo:*');
      expect(actual).toEqual(expected);
    });

    test('should support nested queries indicated by curly braces', () => {
      const expected = nodeTypes.function.buildNode(
        'nested',
        'nestedField',
        nodeTypes.function.buildNode('is', 'childOfNested', 'foo')
      );
      const actual = fromKueryExpression('nestedField:{ childOfNested: foo }');
      expect(actual).toEqual(expected);
    });

    test('should support nested subqueries and subqueries inside nested queries', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', 'response', '200'),
        nodeTypes.function.buildNode(
          'nested',
          'nestedField',
          nodeTypes.function.buildNode('or', [
            nodeTypes.function.buildNode('is', 'childOfNested', 'foo'),
            nodeTypes.function.buildNode('is', 'childOfNested', 'bar'),
          ])
        ),
      ]);
      const actual = fromKueryExpression(
        'response:200 and nestedField:{ childOfNested:foo or childOfNested:bar }'
      );
      expect(actual).toEqual(expected);
    });

    test('should support nested sub-queries inside paren groups', () => {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', 'response', '200'),
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode(
            'nested',
            'nestedField',
            nodeTypes.function.buildNode('is', 'childOfNested', 'foo')
          ),
          nodeTypes.function.buildNode(
            'nested',
            'nestedField',
            nodeTypes.function.buildNode('is', 'childOfNested', 'bar')
          ),
        ]),
      ]);
      const actual = fromKueryExpression(
        'response:200 and ( nestedField:{ childOfNested:foo } or nestedField:{ childOfNested:bar } )'
      );
      expect(actual).toEqual(expected);
    });

    test('should support nested groups inside other nested groups', () => {
      const expected = nodeTypes.function.buildNode(
        'nested',
        'nestedField',
        nodeTypes.function.buildNode(
          'nested',
          'nestedChild',
          nodeTypes.function.buildNode('is', 'doublyNestedChild', 'foo')
        )
      );
      const actual = fromKueryExpression('nestedField:{ nestedChild:{ doublyNestedChild:foo } }');
      expect(actual).toEqual(expected);
    });

    describe('complex queries', () => {
      it('with many expressions', () => {
        const expression = `((alert.attributes.alertTypeId:.index-threshold and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:siem.signals and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:siem.notifications and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:metrics.alert.threshold and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:metrics.alert.inventory.threshold and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:logs.alert.document.count and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_cluster_health and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_license_expiration and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_cpu_usage and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_nodes_changed and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_logstash_version_mismatch and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_kibana_version_mismatch and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:monitoring_alert_elasticsearch_version_mismatch and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:apm.transaction_duration and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:apm.transaction_duration_anomaly and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:apm.error_rate and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:xpack.uptime.alerts.monitorStatus and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:xpack.uptime.alerts.tls and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)) or (alert.attributes.alertTypeId:xpack.uptime.alerts.durationAnomaly and alert.attributes.consumer:(alerts or builtInAlerts or siem or infrastructure or logs or monitoring or apm or uptime)))`;
        const result = fromKueryExpression(Array(100).fill(expression).join(' and '));
        expect(result.arguments.length).toBe(100);
      });

      it('with many subqueries', () => {
        const expression = '('.repeat(1000) + 'foo' + ')'.repeat(1000);
        const result = fromKueryExpression(expression);
        expect(result.arguments.length).toBe(2);
      });

      it('with many spaces', () => {
        const expression = `foo${' '.repeat(10000)}bar`;
        const result = fromKueryExpression(expression);
        expect(result.arguments.length).toBe(2);
      });
    });
  });

  describe('fromLiteralExpression', () => {
    test('should create literal nodes for unquoted values with correct primitive types', () => {
      const stringLiteral = nodeTypes.literal.buildNode('foo');
      const booleanFalseLiteral = nodeTypes.literal.buildNode(false);
      const booleanTrueLiteral = nodeTypes.literal.buildNode(true);

      expect(fromLiteralExpression('foo')).toEqual(stringLiteral);
      expect(fromLiteralExpression('true')).toEqual(booleanTrueLiteral);
      expect(fromLiteralExpression('false')).toEqual(booleanFalseLiteral);

      expect(fromLiteralExpression('.3').value).toEqual('.3');
      expect(fromLiteralExpression('.36').value).toEqual('.36');
      expect(fromLiteralExpression('.00001').value).toEqual('.00001');
      expect(fromLiteralExpression('3').value).toEqual('3');
      expect(fromLiteralExpression('-4').value).toEqual('-4');
      expect(fromLiteralExpression('0').value).toEqual('0');
      expect(fromLiteralExpression('0.0').value).toEqual('0.0');
      expect(fromLiteralExpression('2.0').value).toEqual('2.0');
      expect(fromLiteralExpression('0.8').value).toEqual('0.8');
      expect(fromLiteralExpression('790.9').value).toEqual('790.9');
      expect(fromLiteralExpression('0.0001').value).toEqual('0.0001');
      expect(fromLiteralExpression('96565646732345').value).toEqual('96565646732345');
      expect(fromLiteralExpression('070').value).toEqual('070');

      expect(fromLiteralExpression('..4').value).toEqual('..4');
      expect(fromLiteralExpression('.3text').value).toEqual('.3text');
      expect(fromLiteralExpression('text').value).toEqual('text');
      expect(fromLiteralExpression('.').value).toEqual('.');
      expect(fromLiteralExpression('-').value).toEqual('-');
      expect(fromLiteralExpression('001').value).toEqual('001');
      expect(fromLiteralExpression('00.2').value).toEqual('00.2');
      expect(fromLiteralExpression('0.0.1').value).toEqual('0.0.1');
      expect(fromLiteralExpression('3.').value).toEqual('3.');
      expect(fromLiteralExpression('--4').value).toEqual('--4');
      expect(fromLiteralExpression('-.4').value).toEqual('-.4');
      expect(fromLiteralExpression('-0').value).toEqual('-0');
      expect(fromLiteralExpression('00949').value).toEqual('00949');
    });

    test('should allow escaping of special characters with a backslash', () => {
      const expected = nodeTypes.literal.buildNode('\\():<>"*');
      // yo dawg
      const actual = fromLiteralExpression('\\\\\\(\\)\\:\\<\\>\\"\\*');
      expect(actual).toEqual(expected);
    });

    test('should allow escaping of unicode sequences with a backslash', () => {
      const expected = nodeTypes.literal.buildNode('\\u00A0');
      const actual = fromLiteralExpression('\\\\u00A0');
      expect(actual).toEqual(expected);
    });

    test('should support double quoted strings that do not need escapes except for quotes', () => {
      const expected = nodeTypes.literal.buildNode('\\():<>"*');
      const actual = fromLiteralExpression('"\\():<>\\"*"');
      expect(actual.value).toEqual(expected.value);
    });

    test('should support escaped backslashes inside quoted strings', () => {
      const expected = nodeTypes.literal.buildNode('\\');
      const actual = fromLiteralExpression('"\\\\"');
      expect(actual.value).toEqual(expected.value);
    });

    test('should support escaped unicode sequences inside quoted strings', () => {
      const expected = nodeTypes.literal.buildNode('\\u00A0');
      const actual = fromLiteralExpression('"\\\\u00A0"');
      expect(actual.value).toEqual(expected.value);
    });

    test('should detect wildcards and build wildcard AST nodes', () => {
      const expected = nodeTypes.wildcard.buildNode('foo*bar');
      const actual = fromLiteralExpression('foo*bar');
      expect(actual).toEqual(expected);
    });
  });

  describe('toElasticsearchQuery', () => {
    test("should return the given node type's ES query representation", () => {
      const node = nodeTypes.function.buildNode('exists', 'response');
      const expected = nodeTypes.function.toElasticsearchQuery(node, indexPattern);
      const result = toElasticsearchQuery(node, indexPattern);
      expect(result).toEqual(expected);
    });

    test('should return an empty "and" function for undefined nodes and unknown node types', () => {
      const expected = nodeTypes.function.toElasticsearchQuery(
        nodeTypes.function.buildNode('and', []),
        indexPattern
      );

      expect(toElasticsearchQuery(null as unknown as KueryNode, undefined)).toEqual(expected);

      const noTypeNode = nodeTypes.function.buildNode('exists', 'foo');

      // @ts-expect-error
      delete noTypeNode.type;
      expect(toElasticsearchQuery(noTypeNode)).toEqual(expected);

      const unknownTypeNode = nodeTypes.function.buildNode('exists', 'foo');

      // @ts-expect-error
      unknownTypeNode.type = 'notValid';
      expect(toElasticsearchQuery(unknownTypeNode)).toEqual(expected);
    });

    test("should return the given node type's ES query representation including a time zone parameter when one is provided", () => {
      const config = { dateFormatTZ: 'America/Phoenix' };
      const node = nodeTypes.function.buildNode('is', '@timestamp', '"2018-04-03T19:04:17"');
      const expected = nodeTypes.function.toElasticsearchQuery(node, indexPattern, config);
      const result = toElasticsearchQuery(node, indexPattern, config);
      expect(result).toEqual(expected);
    });
  });

  describe('toKqlExpression', () => {
    test('function node', () => {
      const node = nodeTypes.function.buildNode('exists', 'response');
      const result = toKqlExpression(node);
      expect(result).toEqual('response: *');
    });

    test('literal node', () => {
      const node = nodeTypes.literal.buildNode('foo');
      const result = toKqlExpression(node);
      expect(result).toEqual('foo');
    });

    test('wildcard node', () => {
      const node = nodeTypes.wildcard.buildNode('foo*bar');
      const result = toKqlExpression(node);
      expect(result).toEqual('foo*bar');
    });

    test('should throw an error with invalid node type', () => {
      const noTypeNode = nodeTypes.function.buildNode('exists', 'foo');

      // @ts-expect-error
      delete noTypeNode.type;
      expect(() => toKqlExpression(noTypeNode)).toThrowErrorMatchingInlineSnapshot(
        `"Unknown KQL node type: \\"undefined\\""`
      );
    });

    test('fromKueryExpression toKqlExpression', () => {
      const node = fromKueryExpression(
        'field: (value AND value2 OR "value3") OR nested: { field2: value4 }'
      );
      const result = toKqlExpression(node);
      expect(result).toMatchInlineSnapshot(
        `"(((field: value AND field: value2) OR field: \\"value3\\") OR nested: { field2: value4 })"`
      );
    });
  });
});
