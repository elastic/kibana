/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('suggestions in comments', () => {
  it('does not suggest in single-line comments', async () => {
    const { assertSuggestions } = await setup('^');
    await assertSuggestions('FROM index | EVAL // hey there ^', []);
  });

  it('does not suggest in multi-line comments', async () => {
    const { assertSuggestions } = await setup('^');
    await assertSuggestions('FROM index | EVAL /* ^ */', []);
    await assertSuggestions('FROM index | EVAL /* (^) */', []);
  });

  it('does not suggest in incomplete multi-line comments', async () => {
    const { assertSuggestions } = await setup('^');
    assertSuggestions('FROM index | EVAL /* ^', []);
  });

  test('suggests next to comments', async () => {
    const { suggest } = await setup('^');
    expect((await suggest('FROM index | EVAL ^/* */')).length).toBeGreaterThan(0);
    expect((await suggest('FROM index | EVAL /* */^')).length).toBeGreaterThan(0);
    expect((await suggest('FROM index | EVAL ^// a comment')).length).toBeGreaterThan(0);
    expect((await suggest('FROM index | EVAL // a comment\n^')).length).toBeGreaterThan(0);
  });

  test('handles multiple comments', async () => {
    const { assertSuggestions } = await setup('^');
    assertSuggestions('FROM index | EVAL /* comment1 */ x + /* comment2 ^ */ 1', []);
    assertSuggestions('FROM index | EVAL /* ^ comment1 */ x + /* comment2 ^ */ 1', []);
    assertSuggestions('FROM index | EVAL /* comment1 */ x + /* comment2 */ 1 // comment3 ^', []);
  });
});
