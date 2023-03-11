/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAst } from './ast';
import { getProp } from './props';
import { getEnds, getExpandedEnds } from './ends';

const source = `{
  "foo": "bar",
}`;
const ast = getAst(source);
const foo = getProp(ast, 'foo')!;

describe('getEnds()', () => {
  it('returns the index of the first char of a node, and the index just past the last char', () => {
    expect(getEnds(foo.value)).toMatchInlineSnapshot(`
      Array [
        11,
        16,
      ]
    `);
    expect(source.slice(...getEnds(foo.value))).toMatchInlineSnapshot(`"\\"bar\\""`);
  });
});

describe('getExpandedEnds()', () => {
  it('returns the index of the first char of whitespace preceding a node, and the index just past the last char and optionally trailing comma', () => {
    expect(getExpandedEnds(source, foo.value)).toMatchInlineSnapshot(`
      Array [
        10,
        17,
      ]
    `);
    expect(source.slice(...getExpandedEnds(source, foo.value))).toMatchInlineSnapshot(
      `" \\"bar\\","`
    );
  });
});
