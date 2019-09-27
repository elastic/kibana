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

function colIsInTokenRange(column: number, token: Token) {
  return (
    token.position.column <= column && token.position.column + (token.value.length - 1) >= column
  );
}

export class TokenIteratorImpl implements TokenIterator {
  private currentTokenIdx: number;
  private currentPosition: Position;
  private tokensLineCache: Token[];

  constructor(private readonly provider: TokensProvider, startPosition: Position) {
    this.currentPosition = { ...startPosition };
    this.tokensLineCache = this.provider.getTokens(startPosition.lineNumber) || [];
    this.currentTokenIdx = this.tokensLineCache.findIndex(token =>
      colIsInTokenRange(startPosition.column, token)
    );
  }

  private updateLineTokens(tokens: Token[]) {
    this.tokensLineCache = tokens;
  }

  private updatePosition(info: { idx: number; token: Token }) {
    this.currentTokenIdx = info.idx;
    this.currentPosition = { ...info.token.position };
  }

  private getLineOffset() {
    return this.currentPosition.lineNumber - 1;
  }

  getCurrentToken(): Token | null {
    return this.provider.getTokenAt(this.currentPosition);
  }

  private step(direction: 'forward' | 'backward'): Token | null {
    const forward = direction === 'forward';
    const stepValue = forward ? 1 : -1;
    const nextIdx = this.currentTokenIdx + stepValue;

    let nextToken = this.tokensLineCache[nextIdx];
    // Check current row
    if (nextToken) {
      this.updatePosition({ idx: this.currentTokenIdx + 1, token: nextToken });
      return nextToken;
    }

    // Check next line
    const nextLineNumber = this.getLineOffset() + stepValue;
    const nextLineTokens = this.provider.getTokens(nextLineNumber);
    if (nextLineTokens) {
      this.updateLineTokens(nextLineTokens);
      nextToken = nextLineTokens[0];
      this.updatePosition({ idx: 0, token: nextToken });
    }

    // We have reached the beginning or the end
    return null;
  }

  stepForward(): Token | null {
    return this.step('forward');
  }

  stepBackward(): Token | null {
    return this.step('backward');
  }

  getCurrentPosition(): Position {
    return this.currentPosition;
  }
}
