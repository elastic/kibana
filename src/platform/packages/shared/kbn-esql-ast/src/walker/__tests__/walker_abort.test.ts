/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { ESQLIntegerLiteral } from '../../types';
import { Walker } from '../walker';

describe('aborting traversal', () => {
  test('can abort traversal after second comand argument', () => {
    const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
    const sources: string[] = [];

    Walker.walk(ast, {
      visitSource: (node, parent, walker) => {
        sources.push(node.name);
        if (sources.length === 2) {
          walker.abort();
        }
      },
    });

    expect(sources).toStrictEqual(['a', 'b']);
  });

  test('can abort traversal after second function argument', () => {
    const { ast } = EsqlQuery.fromSrc('ROW fn(1, 2, 3, gg(4, 5))');
    const sources: number[] = [];

    Walker.walk(ast, {
      visitLiteral: (node, parent, walker) => {
        sources.push(node.value as number);
        if (sources.length === 2) {
          walker.abort();
        }
      },
    });

    expect(sources).toStrictEqual([1, 2]);
  });

  test('can abort traversal after second field', () => {
    const { ast } = EsqlQuery.fromSrc('FROM index METADATA a, b, c');
    const sources: string[] = [];

    Walker.walk(ast, {
      visitColumn: (node, parent, walker) => {
        sources.push(node.name);
        if (sources.length === 2) {
          walker.abort();
        }
      },
    });

    expect(sources).toStrictEqual(['a', 'b']);
  });

  test('can abort traversal after second map entry', () => {
    const { ast } = EsqlQuery.fromSrc('ROW fn(TRUE, { "foo": 1, "bar": 2, "baz": 3 })');
    const keys: string[] = [];
    const values: number[] = [];

    Walker.walk(ast, {
      visitMapEntry: (node, parent, walker) => {
        keys.push(node.key.valueUnquoted);
        values.push((node.value as ESQLIntegerLiteral).value);
        if (keys.length === 2) {
          walker.abort();
        }
      },
    });

    expect(keys).toStrictEqual(['foo', 'bar']);
    expect(values).toStrictEqual([1, 2]);
  });

  test('can abort traversal after second key entry', () => {
    const { ast } = EsqlQuery.fromSrc('ROW fn(TRUE, { "foo": 1, "bar": 2, "baz": 3 })');
    const keys: string[] = [];
    const values: number[] = [];

    Walker.walk(ast, {
      visitLiteral: (node, parent, walker) => {
        if (node.literalType === 'keyword') {
          keys.push(node.valueUnquoted);
          if (keys.length === 2) {
            walker.abort();
          }
        } else if (node.literalType === 'integer') {
          values.push((node as ESQLIntegerLiteral).value);
        }
      },
    });

    expect(keys).toStrictEqual(['foo', 'bar']);
    expect(values).toStrictEqual([1]);
  });

  test('can abort traversal before next command', () => {
    const { ast } = EsqlQuery.fromSrc('FROM index | LIMIT 123');
    const commands: string[] = [];

    Walker.walk(ast, {
      visitCommand: (node, parent, walker) => {
        commands.push(node.name);
        if (commands.length === 1) {
          walker.abort();
        }
      },
    });

    expect(commands).toStrictEqual(['from']);
  });

  test('can abort traversal in the middle of source component', () => {
    const { ast } = EsqlQuery.fromSrc('FROM a:b, c::d');
    const components: string[] = [];

    Walker.walk(ast, {
      visitLiteral: (node, parent, walker) => {
        components.push(node.value as string);
        if (components.length === 1) {
          walker.abort();
        }
      },
    });

    expect(components).toStrictEqual(['a']);
  });

  test('can abort traversal in the middle of source component (backward)', () => {
    const { ast } = EsqlQuery.fromSrc('FROM a:b, c::d');
    const components: string[] = [];

    Walker.walk(ast, {
      visitLiteral: (node, parent, walker) => {
        components.push(node.value as string);
        if (components.length === 3) {
          walker.abort();
        }
      },
      order: 'backward',
    });

    expect(components).toStrictEqual(['d', 'c', 'b']);
  });
});
