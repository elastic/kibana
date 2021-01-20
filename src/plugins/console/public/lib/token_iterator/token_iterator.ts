/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Position, Token, TokensProvider } from '../../types';

function isColumnInTokenRange(column: number, token: Token) {
  if (column < token.position.column) {
    return false;
  }
  return column <= token.position.column + token.value.length;
}

export class TokenIterator {
  private currentTokenIdx = -1;
  private currentPosition: Position = { lineNumber: -1, column: -1 };
  private tokensLineCache: Token[];

  constructor(private readonly provider: TokensProvider, startPosition: Position) {
    this.tokensLineCache = this.provider.getTokens(startPosition.lineNumber) || [];
    const tokenIdx = this.tokensLineCache.findIndex((token) =>
      isColumnInTokenRange(startPosition.column, token)
    );
    if (tokenIdx > -1) {
      this.updatePosition({
        tokenIdx,
        position: this.tokensLineCache[tokenIdx].position,
      });
    } else {
      this.updatePosition({ tokenIdx: -1, position: startPosition });
    }
  }

  private updateLineTokens(tokens: Token[]) {
    this.tokensLineCache = tokens;
  }

  private updatePosition(info: { tokenIdx: number; position: Position }) {
    this.currentTokenIdx = info.tokenIdx;
    this.currentPosition = { ...info.position };
  }

  private step(direction: 1 | -1): Token | null {
    const nextIdx = this.currentTokenIdx + direction;

    let nextToken = this.tokensLineCache[nextIdx];
    // Check current row
    if (nextToken) {
      this.updatePosition({
        tokenIdx: nextIdx,
        position: nextToken.position,
      });
      return nextToken;
    }

    // Check next line
    const nextLineNumber = this.currentPosition.lineNumber + direction;
    const nextLineTokens = this.provider.getTokens(nextLineNumber);
    if (nextLineTokens) {
      this.updateLineTokens(nextLineTokens);
      let idx: number;
      if (direction > 0) {
        nextToken = nextLineTokens[0];
        idx = 0;
      } else {
        nextToken = nextLineTokens[nextLineTokens.length - 1];
        idx = nextToken ? nextLineTokens.length - 1 : 0;
      }

      const nextPosition = nextToken
        ? nextToken.position
        : { column: 1, lineNumber: nextLineNumber };
      this.updatePosition({ tokenIdx: idx, position: nextPosition });
      return nextToken || null;
    }

    // We have reached the beginning or the end
    return null;
  }

  /**
   * Report the token under the iterator's internal cursor.
   */
  public getCurrentToken(): Token | null {
    return this.tokensLineCache[this.currentTokenIdx] || null;
  }

  /**
   * Return the current position in the document.
   *
   * This will correspond to the position of a token.
   *
   * Note: this method may not be that useful given {@link getCurrentToken}.
   */
  public getCurrentPosition(): Position {
    return this.currentPosition;
  }

  /**
   * Go to the previous token in the document.
   *
   * Stepping to the previous token can return null under the following conditions:
   *
   * 1. We are at the beginning of the document.
   * 2. The preceding line is empty - no tokens.
   * 3. We are in an empty document - not text, so no tokens.
   */
  public stepBackward(): Token | null {
    return this.step(-1);
  }

  /**
   * See documentation for {@link stepBackward}.
   *
   * Steps forward.
   */
  public stepForward(): Token | null {
    return this.step(1);
  }

  /**
   * Get the line number of the current token.
   *
   * Can be considered a convenience method for:
   *
   * ```ts
   * it.getCurrentToken().lineNumber;
   * ```
   */
  public getCurrentTokenLineNumber(): number | null {
    const currentToken = this.getCurrentToken();
    if (currentToken) {
      return currentToken.position.lineNumber;
    }
    return null;
  }

  /**
   * See documentation for {@link getCurrentTokenLineNumber}.
   *
   * Substitutes `column` for `lineNumber`.
   */
  public getCurrentTokenColumn(): number | null {
    const currentToken = this.getCurrentToken();
    if (currentToken) {
      return currentToken.position.column;
    }
    return null;
  }
}
