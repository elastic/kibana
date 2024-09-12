/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreEditor, Position, Token } from '../../types';

enum Move {
  ForwardOneCharacter = 1,
  ForwardOneToken, // the column position may jump to the next token by autocomplete
  ForwardTwoTokens, // the column position could jump two tokens due to autocomplete
}

const knownTypingInTokenTypes = new Map<Move, Map<string, Set<string>>>([
  [
    Move.ForwardOneCharacter,
    new Map<string, Set<string>>([
      // a pair of the last evaluated token type and a set of the current token types
      ['', new Set(['method'])],
      ['url.amp', new Set(['url.param'])],
      ['url.comma', new Set(['url.part', 'url.questionmark'])],
      ['url.equal', new Set(['url.value'])],
      ['url.param', new Set(['url.amp', 'url.equal'])],
      ['url.questionmark', new Set(['url.param'])],
      ['url.slash', new Set(['url.part', 'url.questionmark'])],
      ['url.value', new Set(['url.amp'])],
    ]),
  ],
  [
    Move.ForwardOneToken,
    new Map<string, Set<string>>([
      ['method', new Set(['url.part'])],
      ['url.amp', new Set(['url.amp', 'url.equal'])],
      ['url.comma', new Set(['url.comma', 'url.questionmark', 'url.slash'])],
      ['url.equal', new Set(['url.amp'])],
      ['url.param', new Set(['url.equal'])],
      ['url.part', new Set(['url.comma', 'url.questionmark', 'url.slash'])],
      ['url.questionmark', new Set(['url.equal'])],
      ['url.slash', new Set(['url.comma', 'url.questionmark', 'url.slash'])],
      ['url.value', new Set(['url.amp'])],
      ['whitespace', new Set(['url.comma', 'url.questionmark', 'url.slash'])],
    ]),
  ],
  [
    Move.ForwardTwoTokens,
    new Map<string, Set<string>>([['url.part', new Set(['url.param', 'url.part'])]]),
  ],
]);

const getOneCharacterNextOnTheRight = (pos: Position, coreEditor: CoreEditor): string => {
  const range = {
    start: { column: pos.column + 1, lineNumber: pos.lineNumber },
    end: { column: pos.column + 2, lineNumber: pos.lineNumber },
  };
  return coreEditor.getValueInRange(range);
};

/**
 * Examines a change from the last evaluated to the current token and one
 * character next to the current token position on the right. Returns true if
 * the change looks like typing in, false otherwise.
 *
 * This function is supposed to filter out situations where autocomplete is not
 * preferable, such as clicking around the editor, navigating the editor via
 * keyboard arrow keys, etc.
 */
export const looksLikeTypingIn = (
  lastEvaluatedToken: Token,
  currentToken: Token,
  coreEditor: CoreEditor
): boolean => {
  // if the column position moves to the right in the same line and the current
  // token length is 1, then user is possibly typing in a character.
  if (
    lastEvaluatedToken.position.column < currentToken.position.column &&
    lastEvaluatedToken.position.lineNumber === currentToken.position.lineNumber &&
    currentToken.value.length === 1 &&
    getOneCharacterNextOnTheRight(currentToken.position, coreEditor) === ''
  ) {
    const moves =
      lastEvaluatedToken.position.column + 1 === currentToken.position.column
        ? [Move.ForwardOneCharacter]
        : [Move.ForwardOneToken, Move.ForwardTwoTokens];
    for (const move of moves) {
      const tokenTypesPairs = knownTypingInTokenTypes.get(move) ?? new Map<string, Set<string>>();
      const currentTokenTypes = tokenTypesPairs.get(lastEvaluatedToken.type) ?? new Set<string>();
      if (currentTokenTypes.has(currentToken.type)) {
        return true;
      }
    }
  }

  // if the column or the line number have changed for the last token or
  // user did not provided a new value, then we should not show autocomplete
  // this guards against triggering autocomplete when clicking around the editor
  if (
    lastEvaluatedToken.position.column !== currentToken.position.column ||
    lastEvaluatedToken.position.lineNumber !== currentToken.position.lineNumber ||
    lastEvaluatedToken.value === currentToken.value
  ) {
    return false;
  }

  return true;
};
