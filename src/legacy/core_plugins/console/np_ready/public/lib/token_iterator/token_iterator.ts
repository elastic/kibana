/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TokenIterator, Position, Token, TokensProvider } from '../../interfaces';

function isColumnInTokenRange(column: number, token: Token) {
  if (column < token.position.column) {
    return false;
  }
  return column <= token.position.column + token.value.length;
}

export class TokenIteratorImpl implements TokenIterator {
  private currentTokenIdx = -1;
  private currentPosition: Position = { lineNumber: -1, column: -1 };
  private tokensLineCache: Token[];

  constructor(private readonly provider: TokensProvider, startPosition: Position) {
    this.tokensLineCache = this.provider.getTokens(startPosition.lineNumber) || [];
    const tokenIdx = this.tokensLineCache.findIndex(token =>
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

  getCurrentToken(): Token | null {
    return this.tokensLineCache[this.currentTokenIdx] || null;
  }

  private step(direction: 1 | -1): Token | null {
    const nextIdx = this.currentTokenIdx + direction;

    let nextToken = this.tokensLineCache[nextIdx];
    // Check current row
    if (nextToken) {
      this.updatePosition({
        tokenIdx: this.currentTokenIdx + direction,
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

  stepForward(): Token | null {
    return this.step(1);
  }

  stepBackward(): Token | null {
    return this.step(-1);
  }

  getCurrentPosition(): Position {
    return this.currentPosition;
  }

  getCurrentTokenLineNumber(): number | null {
    const currentToken = this.getCurrentToken();
    if (currentToken) {
      return currentToken.position.lineNumber;
    }
    return null;
  }

  getCurrentTokenColumn(): number | null {
    const currentToken = this.getCurrentToken();
    if (currentToken) {
      return currentToken.position.column;
    }
    return null;
  }
}
