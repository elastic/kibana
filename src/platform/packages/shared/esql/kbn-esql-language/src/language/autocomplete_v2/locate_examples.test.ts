/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { esqlCommandRegistry } from '../../commands/registry';
import { locate } from '../../esql_js_sim/grammar';

// The examples of the registered commands are the corpus of real queries the package has.
const examples = esqlCommandRegistry
  .getAllCommands()
  .flatMap(({ metadata }) => metadata.examples)
  .map((example) => example.replace(/^…/, 'FROM a '));

/** The start and the end of every token of a query. */
const tokenBoundaries = (query: string): number[] => {
  const { tokens } = Parser.create(query);
  tokens.fill();
  const offsets = new Set([0, query.length]);

  for (const { start, stop } of tokens.tokens) {
    offsets.add(Math.max(start, 0));
    offsets.add(Math.max(stop + 1, 0));
  }

  return [...offsets];
};

describe('locate on the command examples', () => {
  it('has examples to run on', () => {
    expect(examples.length).toBeGreaterThan(50);
  });

  it('never throws at a token boundary', () => {
    for (const example of examples) {
      for (const offset of tokenBoundaries(example)) {
        expect(() => locate(example, offset)).not.toThrow();
      }
    }
  });

  it('finds every example valid at its end', () => {
    const invalid = examples.filter(
      (example) => locate(example, example.length).position === 'invalid'
    );

    expect(invalid).toEqual([]);
  });
});
