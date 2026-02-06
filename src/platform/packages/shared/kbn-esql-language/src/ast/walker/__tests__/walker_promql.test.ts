/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../../composer/query';
import { Walker } from '../walker';
import type {
  PromQLAstNode,
  PromQLAstQueryExpression,
  PromQLFunction,
  PromQLSelector,
  PromQLBinaryExpression,
  PromQLLabelMap,
  PromQLLabel,
  PromQLIdentifier,
  PromQLLiteral,
  PromQLGrouping,
  PromQLSubquery,
  PromQLParens,
  PromQLUnaryExpression,
  PromQLEvaluation,
  PromQLOffset,
  PromQLAt,
  PromQLModifier,
  PromQLGroupModifier,
} from '../../../promql/types';
import type { ESQLCommand } from '../../../types';

describe('Walker PromQL support', () => {
  describe('basic PromQL traversal', () => {
    test('can walk a simple PromQL selector', () => {
      const query = EsqlQuery.fromSrc('PROMQL bytes_in');
      const promqlNodes: PromQLAstNode[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlAny: (node) => {
            promqlNodes.push(node);
          },
        },
      });

      // query -> selector -> identifier (metric name)
      expect(promqlNodes.length).toBe(3);
      expect(promqlNodes[0].type).toBe('query');
      expect(promqlNodes[1].type).toBe('selector');
      expect(promqlNodes[2].type).toBe('identifier');
    });

    test('can walk PromQL selector with metric identifier', () => {
      const query = EsqlQuery.fromSrc('PROMQL http_requests_total');
      const identifiers: PromQLIdentifier[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlIdentifier: (node) => {
            identifiers.push(node);
          },
        },
      });

      expect(identifiers.length).toBe(1);
      expect(identifiers[0].name).toBe('http_requests_total');
    });

    test('can walk PromQL selector with labels', () => {
      const query = EsqlQuery.fromSrc('PROMQL bytes_in{job="prometheus"}');
      const selectors: PromQLSelector[] = [];
      const labelMaps: PromQLLabelMap[] = [];
      const labels: PromQLLabel[] = [];
      const identifiers: PromQLIdentifier[] = [];
      const literals: PromQLLiteral[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlSelector: (node) => selectors.push(node),
          visitPromqlLabelMap: (node) => labelMaps.push(node),
          visitPromqlLabel: (node) => labels.push(node),
          visitPromqlIdentifier: (node) => identifiers.push(node),
          visitPromqlLiteral: (node) => literals.push(node),
        },
      });

      expect(selectors.length).toBe(1);
      expect(labelMaps.length).toBe(1);
      expect(labels.length).toBe(1);
      expect(identifiers.length).toBe(2); // metric name + label name
      expect(literals.length).toBe(1); // label value
      expect(literals[0].literalType).toBe('string');
    });
  });

  describe('PromQL function traversal', () => {
    test('can walk PromQL function call', () => {
      const query = EsqlQuery.fromSrc('PROMQL rate(http_requests_total[5m])');
      const functions: PromQLFunction[] = [];
      const selectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlFunction: (node) => functions.push(node),
          visitPromqlSelector: (node) => selectors.push(node),
        },
      });

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('rate');
      expect(selectors.length).toBe(1);
      expect(selectors[0].name).toBe('http_requests_total');
    });

    test('can walk nested PromQL functions', () => {
      const query = EsqlQuery.fromSrc('PROMQL sum(rate(http_requests_total[5m]))');
      const functions: PromQLFunction[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlFunction: (node) => functions.push(node),
        },
      });

      expect(functions.length).toBe(2);
      expect(functions.map((f) => f.name).sort()).toEqual(['rate', 'sum']);
    });

    test('can walk aggregation function with grouping', () => {
      const query = EsqlQuery.fromSrc('PROMQL sum by (job) (rate(http_requests_total[5m]))');
      const functions: PromQLFunction[] = [];
      const groupings: PromQLGrouping[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlFunction: (node) => functions.push(node),
          visitPromqlGrouping: (node) => groupings.push(node),
        },
      });

      expect(functions.length).toBe(2);
      expect(groupings.length).toBe(1);
      expect(groupings[0].name).toBe('by');
    });
  });

  describe('PromQL binary expression traversal', () => {
    test('can walk PromQL binary expression', () => {
      const query = EsqlQuery.fromSrc('PROMQL a + b');
      const binaryExpressions: PromQLBinaryExpression[] = [];
      const selectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlBinaryExpression: (node) => binaryExpressions.push(node),
          visitPromqlSelector: (node) => selectors.push(node),
        },
      });

      expect(binaryExpressions.length).toBe(1);
      expect(binaryExpressions[0].name).toBe('+');
      expect(selectors.length).toBe(2);
    });

    test('can walk complex PromQL binary expression', () => {
      const query = EsqlQuery.fromSrc('PROMQL (a + b) * c');
      const binaryExpressions: PromQLBinaryExpression[] = [];
      const parens: PromQLParens[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlBinaryExpression: (node) => binaryExpressions.push(node),
          visitPromqlParens: (node) => parens.push(node),
        },
      });

      expect(binaryExpressions.length).toBe(2);
      expect(parens.length).toBe(1);
    });

    test('can walk binary expression with vector matching modifier', () => {
      const query = EsqlQuery.fromSrc('PROMQL a + on(job) b');
      const binaryExpressions: PromQLBinaryExpression[] = [];
      const modifiers: PromQLModifier[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlBinaryExpression: (node) => binaryExpressions.push(node),
          visitPromqlModifier: (node) => modifiers.push(node),
        },
      });

      expect(binaryExpressions.length).toBe(1);
      expect(modifiers.length).toBe(1);
      expect(modifiers[0].name).toBe('on');
    });

    test('can walk binary expression with group modifier', () => {
      const query = EsqlQuery.fromSrc('PROMQL a + on(job) group_left(instance) b');
      const modifiers: PromQLModifier[] = [];
      const groupModifiers: PromQLGroupModifier[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlModifier: (node) => modifiers.push(node),
          visitPromqlGroupModifier: (node) => groupModifiers.push(node),
        },
      });

      expect(modifiers.length).toBe(1);
      expect(groupModifiers.length).toBe(1);
      expect(groupModifiers[0].name).toBe('group_left');
    });
  });

  describe('PromQL unary expression traversal', () => {
    test('can walk PromQL unary expression', () => {
      const query = EsqlQuery.fromSrc('PROMQL -http_requests_total');
      const unaryExpressions: PromQLUnaryExpression[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlUnaryExpression: (node) => unaryExpressions.push(node),
        },
      });

      expect(unaryExpressions.length).toBe(1);
      expect(unaryExpressions[0].name).toBe('-');
    });
  });

  describe('PromQL subquery traversal', () => {
    test('can walk PromQL subquery', () => {
      const query = EsqlQuery.fromSrc('PROMQL rate(http_requests_total[5m])[30m:1m]');
      const subqueries: PromQLSubquery[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlSubquery: (node) => subqueries.push(node),
        },
      });

      expect(subqueries.length).toBe(1);
      expect(subqueries[0].type).toBe('subquery');
    });
  });

  describe('PromQL evaluation modifiers traversal', () => {
    test('can walk PromQL offset modifier', () => {
      const query = EsqlQuery.fromSrc('PROMQL http_requests_total offset 5m');
      const evaluations: PromQLEvaluation[] = [];
      const offsets: PromQLOffset[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlEvaluation: (node) => evaluations.push(node),
          visitPromqlOffset: (node) => offsets.push(node),
        },
      });

      expect(evaluations.length).toBe(1);
      expect(offsets.length).toBe(1);
    });

    test('can walk PromQL @ modifier', () => {
      const query = EsqlQuery.fromSrc('PROMQL http_requests_total @ 1609459200');
      const evaluations: PromQLEvaluation[] = [];
      const atModifiers: PromQLAt[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlEvaluation: (node) => evaluations.push(node),
          visitPromqlAt: (node) => atModifiers.push(node),
        },
      });

      expect(evaluations.length).toBe(1);
      expect(atModifiers.length).toBe(1);
    });
  });

  describe('PromQL literal traversal', () => {
    test('can walk numeric literal', () => {
      const query = EsqlQuery.fromSrc('PROMQL 42');
      const literals: PromQLLiteral[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlLiteral: (node) => literals.push(node),
        },
      });

      expect(literals.length).toBe(1);
      expect(literals[0].literalType).toBe('integer');
      expect(literals[0].value).toBe(42);
    });

    test('can walk time literal in selector', () => {
      const query = EsqlQuery.fromSrc('PROMQL http_requests_total[5m]');
      const literals: PromQLLiteral[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlLiteral: (node) => literals.push(node),
        },
      });

      expect(literals.length).toBe(1);
      expect(literals[0].literalType).toBe('time');
    });
  });

  describe('combined ES|QL and PromQL traversal', () => {
    test('can walk both ES|QL and PromQL nodes', () => {
      const query = EsqlQuery.fromSrc('PROMQL bytes_in{job="test"}');
      const commands: ESQLCommand[] = [];
      const promqlQueries: PromQLAstQueryExpression[] = [];
      const promqlSelectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        visitCommand: (node) => commands.push(node),
        promql: {
          visitPromqlQuery: (node) => promqlQueries.push(node),
          visitPromqlSelector: (node) => promqlSelectors.push(node),
        },
      });

      expect(commands.length).toBe(1);
      expect(commands[0].name).toBe('promql');
      expect(promqlQueries.length).toBe(1);
      expect(promqlSelectors.length).toBe(1);
    });

    test('can walk PromQL query wrapped in ES|QL parens', () => {
      const query = EsqlQuery.fromSrc('PROMQL (bytes_in)');
      const promqlSelectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlSelector: (node) => promqlSelectors.push(node),
        },
      });

      // The parens in this case is an ES|QL parens wrapping the PromQL query
      expect(promqlSelectors.length).toBe(1);
    });

    test('can walk named PromQL query', () => {
      const query = EsqlQuery.fromSrc('PROMQL name = (bytes_in)');
      const promqlSelectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlSelector: (node) => promqlSelectors.push(node),
        },
      });

      expect(promqlSelectors.length).toBe(1);
    });

    test('can walk PromQL query with params', () => {
      const query = EsqlQuery.fromSrc('PROMQL k=v bytes_in{job="test"}');
      const commands: ESQLCommand[] = [];
      const promqlSelectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        visitCommand: (node) => commands.push(node),
        promql: {
          visitPromqlSelector: (node) => promqlSelectors.push(node),
        },
      });

      expect(commands.length).toBe(1);
      expect(promqlSelectors.length).toBe(1);
    });
  });

  describe('visitPromqlAny fallback', () => {
    test('visitPromqlAny is called for all PromQL node types', () => {
      const query = EsqlQuery.fromSrc('PROMQL rate(http_requests_total{job="api"}[5m])');
      const allNodes: PromQLAstNode[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlAny: (node) => allNodes.push(node),
        },
      });

      // Should visit: query, function, selector, identifier (metric), label-map, label, identifier (label name), literal (label value), literal (time)
      expect(allNodes.length).toBeGreaterThan(5);

      const nodeTypes = allNodes.map((n) => n.type);
      expect(nodeTypes).toContain('query');
      expect(nodeTypes).toContain('function');
      expect(nodeTypes).toContain('selector');
      expect(nodeTypes).toContain('identifier');
      expect(nodeTypes).toContain('label-map');
      expect(nodeTypes).toContain('label');
      expect(nodeTypes).toContain('literal');
    });

    test('specific visitor takes precedence over visitPromqlAny', () => {
      const query = EsqlQuery.fromSrc('PROMQL http_requests_total');
      const anyNodes: PromQLAstNode[] = [];
      const selectors: PromQLSelector[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlAny: (node) => anyNodes.push(node),
          visitPromqlSelector: (node) => selectors.push(node),
        },
      });

      // visitPromqlSelector should be called for selector, so visitPromqlAny shouldn't include it
      expect(selectors.length).toBe(1);
      expect(anyNodes.find((n) => n.type === 'selector')).toBeUndefined();
    });
  });

  describe('abort functionality with PromQL', () => {
    test('can abort PromQL traversal', () => {
      const query = EsqlQuery.fromSrc('PROMQL rate(sum(http_requests_total[5m]))');
      const functions: PromQLFunction[] = [];

      Walker.walk(query.ast, {
        promql: {
          visitPromqlFunction: (node, parent, walker) => {
            functions.push(node);
            if (functions.length === 1) {
              walker.abort();
            }
          },
        },
      });

      expect(functions.length).toBe(1);
    });
  });
});
