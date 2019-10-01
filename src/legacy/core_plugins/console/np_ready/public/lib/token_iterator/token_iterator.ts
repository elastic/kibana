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
  private currentTokenIdx: number;
  private currentPosition: Position;
  private tokensLineCache: Token[];

  constructor(private readonly provider: TokensProvider, startPosition: Position) {
    this.currentPosition = { ...startPosition };
    this.tokensLineCache = this.provider.getTokens(startPosition.lineNumber) || [];
    this.currentTokenIdx = this.tokensLineCache.findIndex(token =>
      isColumnInTokenRange(startPosition.column, token)
    );
  }

  private updateLineTokens(tokens: Token[]) {
    this.tokensLineCache = tokens;
  }

  private updatePosition(info: { idx: number; position: Position }) {
    this.currentTokenIdx = info.idx;
    this.currentPosition = { ...info.position };
  }

  getCurrentToken(): Token | null {
    return (
      this.tokensLineCache.find(token =>
        isColumnInTokenRange(this.currentPosition.column, token)
      ) || null
    );
  }

  private step(direction: 1 | -1): Token | null {
    const nextIdx = this.currentTokenIdx + direction;

    let nextToken = this.tokensLineCache[nextIdx];
    // Check current row
    if (nextToken) {
      this.updatePosition({ idx: this.currentTokenIdx + direction, position: nextToken.position });
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
        idx = nextLineTokens.length - 1;
      }
      if (nextToken == null) {
        idx = 0;
      }

      const nextPosition = nextToken
        ? nextToken.position
        : { column: 1, lineNumber: nextLineNumber };
      this.updatePosition({ idx, position: nextPosition });
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
    return this.currentPosition.lineNumber;
  }
}
