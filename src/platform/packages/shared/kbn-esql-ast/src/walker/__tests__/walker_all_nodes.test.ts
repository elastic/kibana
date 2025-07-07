/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import * as fixtures from '../../__tests__/fixtures';
import { Walker } from '../walker';
import { ESQLAstExpression, ESQLProperNode } from '../../types';
import { isProperNode } from '../../ast/is';

interface JsonWalkerOptions {
  visitObject?: (node: Record<string, unknown>) => void;
  visitArray?: (node: unknown[]) => void;
  visitString?: (node: string) => void;
  visitNumber?: (node: number) => void;
  visitBigint?: (node: bigint) => void;
  visitBoolean?: (node: boolean) => void;
  visitNull?: () => void;
  visitUndefined?: () => void;
}

const walkJson = (json: unknown, options: JsonWalkerOptions = {}) => {
  switch (typeof json) {
    case 'string': {
      options.visitString?.(json);
      break;
    }
    case 'number': {
      options.visitNumber?.(json);
      break;
    }
    case 'bigint': {
      options.visitBigint?.(json as bigint);
      break;
    }
    case 'boolean': {
      options.visitBoolean?.(json);
      break;
    }
    case 'undefined': {
      options.visitUndefined?.();
      break;
    }
    case 'object': {
      if (!json) {
        options.visitNull?.();
      } else if (Array.isArray(json)) {
        options.visitArray?.(json);
        const length = json.length;

        for (let i = 0; i < length; i++) {
          walkJson(json[i], options);
        }
      } else {
        options.visitObject?.(json as Record<string, unknown>);
        const values = Object.values(json as Record<string, unknown>);
        const length = values.length;

        for (let i = 0; i < length; i++) {
          const value = values[i];
          walkJson(value, options);
        }
      }
    }
  }
};

const assertAllNodesAreVisited = (query: string) => {
  const { ast, errors } = EsqlQuery.fromSrc(query);

  expect(errors).toStrictEqual([]);

  const allNodes = new Set<ESQLProperNode>();
  const allExpressionNodes = new Set<ESQLAstExpression>();
  const allWalkerAnyNodes = new Set<ESQLProperNode>();
  const allWalkerExpressionNodes = new Set<ESQLAstExpression>();

  walkJson(ast, {
    visitObject: (node) => {
      if (isProperNode(node)) {
        allNodes.add(node);
        if (node.type !== 'command') {
          allExpressionNodes.add(node);
        }
      }
    },
  });

  Walker.walk(ast, {
    visitAny: (node) => {
      allWalkerAnyNodes.add(node);
    },
    visitSingleAstItem: (node) => {
      allWalkerExpressionNodes.add(node);
    },
  });

  expect(allWalkerAnyNodes).toStrictEqual(allNodes);
  expect(allWalkerAnyNodes.size).toBe(allNodes.size);
  expect(allWalkerExpressionNodes).toStrictEqual(allExpressionNodes);
  expect(allWalkerExpressionNodes.size).toBe(allExpressionNodes.size);
};

describe('Walker walks all nodes', () => {
  test('small query', () => {
    assertAllNodesAreVisited(fixtures.smallest);
  });

  test('sample SORT command from docs', () => {
    assertAllNodesAreVisited(fixtures.sortCommandFromDocs);
  });

  test('large query', () => {
    assertAllNodesAreVisited(fixtures.large);
  });
});
