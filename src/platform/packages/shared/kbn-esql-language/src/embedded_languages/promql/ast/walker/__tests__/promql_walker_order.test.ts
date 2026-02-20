/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../../../parser/parser';
import { PromqlWalker } from '../walker';
import type { PromQLIdentifier } from '../../../types';

describe('PromQL walker traversal order', () => {
  describe('selector args', () => {
    test('by default walks in "forward" order', () => {
      const query = PromQLParser.parse('metric{a="1", b="2", c="3"}');
      const identifiers: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlIdentifier: (node) => identifiers.push(node.name),
      });

      // First identifier is the metric name, then label names
      expect(identifiers).toStrictEqual(['metric', 'a', 'b', 'c']);
    });

    test('can explicitly specify "forward" order', () => {
      const query = PromQLParser.parse('metric{a="1", b="2", c="3"}');
      const identifiers: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlIdentifier: (node) => identifiers.push(node.name),
        order: 'forward',
      });

      expect(identifiers).toStrictEqual(['metric', 'a', 'b', 'c']);
    });

    test('can walk in "backward" order', () => {
      const query = PromQLParser.parse('metric{a="1", b="2", c="3"}');
      const identifiers: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlIdentifier: (node) => identifiers.push(node.name),
        order: 'backward',
      });

      expect(identifiers).toStrictEqual(['c', 'b', 'a', 'metric']);
    });
  });

  describe('function arguments', () => {
    test('in "forward" order', () => {
      const query = PromQLParser.parse('label_join(metric, "dst", ",", "a", "b")');
      const literals: Array<string | number> = [];

      PromqlWalker.walk(query.root, {
        visitPromqlLiteral: (node) => {
          if (node.literalType === 'string' || node.literalType === 'integer') {
            literals.push(node.value as string | number);
          }
        },
        order: 'forward',
      });

      expect(literals).toStrictEqual(['"dst"', '","', '"a"', '"b"']);
    });

    test('in "backward" order', () => {
      const query = PromQLParser.parse('label_join(metric, "dst", ",", "a", "b")');
      const literals: Array<string | number> = [];

      PromqlWalker.walk(query.root, {
        visitPromqlLiteral: (node) => {
          if (node.literalType === 'string' || node.literalType === 'integer') {
            literals.push(node.value as string | number);
          }
        },
        order: 'backward',
      });

      expect(literals).toStrictEqual(['"b"', '"a"', '","', '"dst"']);
    });
  });

  describe('binary expression operands', () => {
    test('in "forward" order', () => {
      const query = PromQLParser.parse('a + b');
      const selectors: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlSelector: (node) => {
          // Get metric name from args
          const metricId = node.args.find((arg) => arg.type === 'identifier') as
            | PromQLIdentifier
            | undefined;
          if (metricId) {
            selectors.push(metricId.name);
          }
        },
        order: 'forward',
      });

      expect(selectors).toStrictEqual(['a', 'b']);
    });

    test('in "backward" order', () => {
      const query = PromQLParser.parse('a + b');
      const selectors: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlSelector: (node) => {
          const metricId = node.args.find((arg) => arg.type === 'identifier') as
            | PromQLIdentifier
            | undefined;
          if (metricId) {
            selectors.push(metricId.name);
          }
        },
        order: 'backward',
      });

      expect(selectors).toStrictEqual(['b', 'a']);
    });

    test('complex binary expression in "forward" order', () => {
      const query = PromQLParser.parse('a + b * c');
      const selectors: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlSelector: (node) => {
          const metricId = node.args.find((arg) => arg.type === 'identifier') as
            | PromQLIdentifier
            | undefined;
          if (metricId) {
            selectors.push(metricId.name);
          }
        },
        order: 'forward',
      });

      // Due to precedence: a + (b * c), so visits a, then b, then c
      expect(selectors).toStrictEqual(['a', 'b', 'c']);
    });

    test('complex binary expression in "backward" order', () => {
      const query = PromQLParser.parse('a + b * c');
      const selectors: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlSelector: (node) => {
          const metricId = node.args.find((arg) => arg.type === 'identifier') as
            | PromQLIdentifier
            | undefined;
          if (metricId) {
            selectors.push(metricId.name);
          }
        },
        order: 'backward',
      });

      // Due to precedence: a + (b * c), backward visits c, then b, then a
      expect(selectors).toStrictEqual(['c', 'b', 'a']);
    });
  });

  describe('label map labels', () => {
    test('in "forward" order', () => {
      const query = PromQLParser.parse('metric{x="1", y="2", z="3"}');
      const labelNames: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlLabel: (node) => {
          if (node.labelName.type === 'identifier') {
            labelNames.push(node.labelName.name);
          }
        },
        order: 'forward',
      });

      expect(labelNames).toStrictEqual(['x', 'y', 'z']);
    });

    test('in "backward" order', () => {
      const query = PromQLParser.parse('metric{x="1", y="2", z="3"}');
      const labelNames: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlLabel: (node) => {
          if (node.labelName.type === 'identifier') {
            labelNames.push(node.labelName.name);
          }
        },
        order: 'backward',
      });

      expect(labelNames).toStrictEqual(['z', 'y', 'x']);
    });
  });

  describe('grouping labels', () => {
    test('in "forward" order', () => {
      const query = PromQLParser.parse('sum by (a, b, c) (metric)');
      const identifiers: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlGrouping: () => {
          // Skip the grouping node itself, we want its children
        },
        visitPromqlIdentifier: (node, parent) => {
          // Only collect identifiers that are part of grouping
          if (parent && parent.type === 'grouping') {
            identifiers.push(node.name);
          }
        },
        order: 'forward',
      });

      expect(identifiers).toStrictEqual(['a', 'b', 'c']);
    });

    test('in "backward" order', () => {
      const query = PromQLParser.parse('sum by (a, b, c) (metric)');
      const identifiers: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlGrouping: () => {
          // Skip the grouping node itself, we want its children
        },
        visitPromqlIdentifier: (node, parent) => {
          if (parent && parent.type === 'grouping') {
            identifiers.push(node.name);
          }
        },
        order: 'backward',
      });

      expect(identifiers).toStrictEqual(['c', 'b', 'a']);
    });
  });

  describe('label key-value pairs', () => {
    test('in "forward" order walks key before value', () => {
      const query = PromQLParser.parse('metric{job="api"}');
      const nodes: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlIdentifier: (node) => nodes.push(`id:${node.name}`),
        visitPromqlLiteral: (node) => {
          if (node.literalType === 'string') {
            nodes.push(`lit:${node.value}`);
          }
        },
        order: 'forward',
      });

      // metric (identifier), job (identifier), "api" (literal)
      expect(nodes).toStrictEqual(['id:metric', 'id:job', 'lit:"api"']);
    });

    test('in "backward" order walks value before key', () => {
      const query = PromQLParser.parse('metric{job="api"}');
      const nodes: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlIdentifier: (node) => nodes.push(`id:${node.name}`),
        visitPromqlLiteral: (node) => {
          if (node.literalType === 'string') {
            nodes.push(`lit:${node.value}`);
          }
        },
        order: 'backward',
      });

      // Backward: "api" (literal), job (identifier), metric (identifier)
      expect(nodes).toStrictEqual(['lit:"api"', 'id:job', 'id:metric']);
    });
  });

  describe('nested functions', () => {
    test('in "forward" order', () => {
      const query = PromQLParser.parse('sum(rate(metric[5m]))');
      const functions: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlFunction: (node) => functions.push(node.name),
        order: 'forward',
      });

      expect(functions).toStrictEqual(['sum', 'rate']);
    });

    test('in "backward" order', () => {
      const query = PromQLParser.parse('sum(rate(metric[5m]))');
      const functions: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlFunction: (node) => functions.push(node.name),
        order: 'backward',
      });

      // Functions are visited in the same order because we visit parent before children
      // The order option affects the order of children, not parent-child relationship
      expect(functions).toStrictEqual(['sum', 'rate']);
    });
  });

  describe('function with grouping', () => {
    test('in "forward" order walks grouping before args', () => {
      const query = PromQLParser.parse('sum by (job) (metric)');
      const nodeTypes: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlGrouping: () => nodeTypes.push('grouping'),
        visitPromqlSelector: () => nodeTypes.push('selector'),
        order: 'forward',
      });

      expect(nodeTypes).toStrictEqual(['grouping', 'selector']);
    });

    test('in "backward" order walks args before grouping', () => {
      const query = PromQLParser.parse('sum by (job) (metric)');
      const nodeTypes: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlGrouping: () => nodeTypes.push('grouping'),
        visitPromqlSelector: () => nodeTypes.push('selector'),
        order: 'backward',
      });

      expect(nodeTypes).toStrictEqual(['selector', 'grouping']);
    });
  });

  describe('modifier with group modifier', () => {
    test('in "forward" order walks labels before group_modifier', () => {
      const query = PromQLParser.parse('a + on(job) group_left(instance) b');
      const nodeTypes: string[] = [];

      PromqlWalker.walk(query.root, {
        visitPromqlModifier: () => nodeTypes.push('modifier'),
        visitPromqlGroupModifier: () => nodeTypes.push('group-modifier'),
        visitPromqlIdentifier: (node, parent) => {
          if (parent && parent.type === 'modifier') {
            nodeTypes.push(`label:${node.name}`);
          }
        },
        order: 'forward',
      });

      // modifier is visited, then its labels (job), then group_modifier
      expect(nodeTypes).toContain('modifier');
      expect(nodeTypes).toContain('group-modifier');
    });
  });
});
