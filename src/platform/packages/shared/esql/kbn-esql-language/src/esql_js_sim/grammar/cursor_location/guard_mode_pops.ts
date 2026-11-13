/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Parser } from '@elastic/esql';

type EsqlLexer = ReturnType<typeof Parser.create>['lexer'];

// No real token needs more than a few mode pops; a count this high means the lexer is looping.
const MAX_MODE_POPS = 100;

/**
 * Makes a lexer that is put in a mode by hand safe to run. Some modes have a rule that matches
 * no character and pops the mode. On an empty mode stack the pop changes nothing, so the lexer
 * stays in the mode and matches the same rule forever. With the guard it throws instead.
 */
export const guardModePops = (lexer: EsqlLexer): EsqlLexer => {
  const guarded = lexer as unknown as { popMode: () => number };
  const popMode = guarded.popMode.bind(lexer);
  let pops = 0;

  guarded.popMode = () => {
    pops++;

    if (pops > MAX_MODE_POPS) {
      throw new Error('The lexer keeps popping a mode without reading a character');
    }

    return popMode();
  };

  return lexer;
};
