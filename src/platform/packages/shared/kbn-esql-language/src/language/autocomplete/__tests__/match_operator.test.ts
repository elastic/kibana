/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('match operator (:) availability', () => {
  // The ES verifier only supports the match operator in WHERE and STATS commands,
  // or in EVAL within the SCORE function
  const contexts: Array<{ query: string; expected: boolean }> = [
    { query: 'from index | where textField /', expected: true },
    { query: 'from index | where doubleField /', expected: true },
    { query: 'from index | where coalesce(textField /)', expected: false },
    { query: 'from index | where concat(textField, keywordField) /', expected: true },
    { query: 'from index | stats min(doubleField) where textField /', expected: true },
    { query: 'from index | eval score(textField /)', expected: true },
    { query: 'from index | eval textField /', expected: false },
    { query: 'from index | eval doubleField /', expected: false },
    { query: 'from index | eval case(textField /)', expected: false },
  ];

  it.each(contexts)('suggests ":" in "$query": $expected', async ({ query, expected }) => {
    const { suggest } = await setup();
    const suggestions = await suggest(query);
    const hasMatchOperator = suggestions.some(({ label }) => label === ':');

    expect(hasMatchOperator).toBe(expected);
  });

  it.each([
    { query: 'from index | where case(/)', expected: false },
    { query: 'from index | eval score(/)', expected: true },
  ])('suggests MATCH in "$query": $expected', async ({ query, expected }) => {
    const { suggest } = await setup();
    const suggestions = await suggest(query);
    const hasMatchFunction = suggestions.some(({ label }) => label.toLowerCase() === 'match');

    expect(hasMatchFunction).toBe(expected);
  });
});
