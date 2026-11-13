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
import { getGrammarPositions, locate, withoutRecursion } from '../../esql_js_sim/grammar';

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

  // The table of positions is what the command signatures classify. If `locate` reported a
  // place the table does not have, that place could never get a meaning.
  it('expects only arguments and values that the table of positions has', () => {
    const table = new Set(
      getGrammarPositions().map(({ command, path }) => `${command}|${path.join('/')}`)
    );
    // A place inside an expression continues the path of the expression it is in.
    const isListed = (command: string | undefined, located: string[]): boolean => {
      const path = withoutRecursion(located);

      return path.some((_, index) => table.has(`${command}|${path.slice(0, index + 1).join('/')}`));
    };
    const missing = new Set<string>();

    for (const example of examples) {
      for (const offset of tokenBoundaries(example)) {
        const { arguments: expected, followers } = locate(example, offset);
        const places = [
          ...expected.map(({ command, path }) => ({ command, path })),
          ...followers
            .filter((follower) => follower.class === 'value' && follower.id)
            .map(({ command, path, id }) => ({ command, path: [...path, id ?? ''] })),
        ];

        for (const { command, path } of places) {
          if (!isListed(command, path)) {
            missing.add(`${command}: ${path.join(' / ')}`);
          }
        }
      }
    }

    expect([...missing].sort()).toEqual([]);
  });

  it('finds every example valid at its end', () => {
    const invalid = examples.filter(
      (example) => locate(example, example.length).position === 'invalid'
    );

    expect(invalid).toEqual([]);
  });
});
