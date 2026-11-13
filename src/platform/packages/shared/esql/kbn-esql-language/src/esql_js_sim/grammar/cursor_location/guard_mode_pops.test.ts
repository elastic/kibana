/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { guardModePops } from './guard_mode_pops';

// `modeNames` exists on every antlr4 lexer at runtime but is missing from its typings.
const modeNames = (Parser.create('').lexer as unknown as { modeNames: string[] }).modeNames;

describe('guardModePops', () => {
  it.each(modeNames.map((name, mode) => [name, mode] as const))(
    'ends in %s set on an empty mode stack',
    (_name, mode) => {
      const { lexer } = Parser.create('(');
      lexer.removeErrorListeners();
      lexer.setMode(mode);
      guardModePops(lexer);

      let outcome = 'token';
      try {
        lexer.nextToken();
      } catch (error) {
        outcome = 'stopped';
      }

      expect(['token', 'stopped']).toContain(outcome);
    }
  );

  it('stops the mode that pops itself, which would loop without the guard', () => {
    const { lexer } = Parser.create('(');
    lexer.removeErrorListeners();
    lexer.setMode(modeNames.indexOf('IN_MODE'));
    guardModePops(lexer);

    expect(() => lexer.nextToken()).toThrow('keeps popping a mode');
  });

  it('leaves normal lexing alone', () => {
    const { lexer } = Parser.create('FROM a | WHERE b IN (1, 2) | KEEP b');
    guardModePops(lexer);

    expect(lexer.getAllTokens().length).toBeGreaterThan(10);
  });
});
