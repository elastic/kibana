/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { ESQLLiteral } from '../../types';

describe('literal expression', () => {
  it('NULL', () => {
    const text = 'ROW NULL';
    const { ast } = parse(text);
    const literal = ast[0].args[0] as ESQLLiteral;

    expect(literal).toMatchObject({
      type: 'literal',
      literalType: 'null',
      name: 'NULL',
      value: 'NULL',
    });
  });

  it('numeric expression captures "value", and "name" fields', () => {
    const text = 'ROW 1';
    const { ast } = parse(text);
    const literal = ast[0].args[0] as ESQLLiteral;

    expect(literal).toMatchObject({
      type: 'literal',
      literalType: 'integer',
      name: '1',
      value: 1,
    });
  });

  it('doubles vs integers', () => {
    const text = 'ROW a(1.0, 1)';
    const { ast } = parse(text);

    expect(ast[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'function',
          args: [
            {
              type: 'literal',
              literalType: 'double',
            },
            {
              type: 'literal',
              literalType: 'integer',
            },
          ],
        },
      ],
    });
  });

  // TODO: Un-skip once string parsing fixed: https://github.com/elastic/kibana/issues/203445
  it.skip('single-quoted string', () => {
    const text = 'ROW "abc"';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'literal',
          literalType: 'keyword',
          value: 'abc',
        },
      ],
    });
  });

  // TODO: Un-skip once string parsing fixed: https://github.com/elastic/kibana/issues/203445
  it.skip('unescapes characters', () => {
    const text = 'ROW "a\\nbc"';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'literal',
          literalType: 'keyword',
          value: 'a\nbc',
        },
      ],
    });
  });

  // TODO: Un-skip once string parsing fixed: https://github.com/elastic/kibana/issues/203445
  it.skip('triple-quoted string', () => {
    const text = 'ROW """abc"""';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'literal',
          literalType: 'keyword',
          value: 'abc',
        },
      ],
    });
  });
});
