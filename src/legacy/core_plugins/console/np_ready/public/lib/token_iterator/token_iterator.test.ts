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

import { TokenIterator } from './token_iterator';
import { Position, Token, TokensProvider } from '../../types';

const mockTokensProviderFactory = (tokenMtx: Token[][]): TokensProvider => {
  return {
    getTokens(lineNumber: number): Token[] | null {
      return tokenMtx[lineNumber - 1] || null;
    },
    getTokenAt(pos: Position): Token | null {
      return null as any;
    },
  };
};

describe('Token Iterator', () => {
  const tokensProvider = mockTokensProviderFactory([
    [
      { type: 'method', value: 'POST', position: { lineNumber: 1, column: 1 } },
      { type: 'whitespace', value: ' ', position: { lineNumber: 1, column: 5 } },
      { type: 'url.part', value: 'abc', position: { lineNumber: 1, column: 6 } },
    ],
    [],
    [],
    [
      { type: 'whitespace', value: '  ', position: { lineNumber: 4, column: 1 } },
      {
        position: { lineNumber: 4, column: 3 },
        type: 'paren.lparen',
        value: '{',
      },
    ],
  ]);

  it('iterates forwards', () => {
    const it = new TokenIterator(tokensProvider, { lineNumber: 1, column: 1 });
    expect(it.getCurrentToken()).toEqual({
      position: { column: 1, lineNumber: 1 },
      type: 'method',
      value: 'POST',
    });
    expect(it.stepForward()).toEqual({
      position: { column: 5, lineNumber: 1 },
      type: 'whitespace',
      value: ' ',
    });
    expect(it.stepForward()).toEqual({
      position: { column: 6, lineNumber: 1 },
      type: 'url.part',
      value: 'abc',
    });
  });

  it('iterates backwards', () => {
    const it = new TokenIterator(tokensProvider, { lineNumber: 1, column: 8 });
    expect(it.getCurrentToken()).toEqual({
      position: { lineNumber: 1, column: 6 },
      type: 'url.part',
      value: 'abc',
    });
    expect(it.stepBackward()).toEqual({
      position: { column: 5, lineNumber: 1 },
      type: 'whitespace',
      value: ' ',
    });
    expect(it.stepBackward()).toEqual({
      position: { column: 1, lineNumber: 1 },
      type: 'method',
      value: 'POST',
    });
  });

  it('iterates forwards and backwards', () => {
    const it = new TokenIterator(tokensProvider, { lineNumber: 1, column: 8 });
    expect(it.getCurrentToken()).toEqual({
      position: { lineNumber: 1, column: 6 },
      type: 'url.part',
      value: 'abc',
    });
    expect(it.stepBackward()).toEqual({
      position: { column: 5, lineNumber: 1 },
      type: 'whitespace',
      value: ' ',
    });
    expect(it.stepForward()).toEqual({
      position: { column: 6, lineNumber: 1 },
      type: 'url.part',
      value: 'abc',
    });
  });

  describe('iterating across lines', () => {
    it('iterates forwards over lines', () => {
      const it = new TokenIterator(tokensProvider, { lineNumber: 1, column: 1 });
      expect(it.getCurrentToken()).toEqual({
        position: { lineNumber: 1, column: 1 },
        type: 'method',
        value: 'POST',
      });
      it.stepForward();
      it.stepForward();
      expect(it.stepForward()).toBeNull();
      expect(it.stepForward()).toBeNull();
      expect(it.stepForward()).toEqual({
        position: { lineNumber: 4, column: 1 },
        type: 'whitespace',
        value: '  ',
      });
      expect(it.stepForward()).toEqual({
        position: { lineNumber: 4, column: 3 },
        value: '{',
        type: 'paren.lparen',
      });
      // Double step forward to try and mess with internal state
      expect(it.stepForward()).toBeNull();
      expect(it.stepForward()).toBeNull();
      expect(it.stepBackward()).toEqual({
        position: { lineNumber: 4, column: 1 },
        value: '  ',
        type: 'whitespace',
      });
    });

    it('iterates backwards over lines', () => {
      const it = new TokenIterator(tokensProvider, { lineNumber: 4, column: 1 });
      expect(it.getCurrentToken()).toEqual({
        position: { lineNumber: 4, column: 1 },
        type: 'whitespace',
        value: '  ',
      });
      // Double step backward to try and mess with internal state
      expect(it.stepBackward()).toBeNull();
      expect(it.stepBackward()).toBeNull();
      expect(it.stepBackward()).toEqual({
        position: { lineNumber: 1, column: 6 },
        type: 'url.part',
        value: 'abc',
      });
      it.stepBackward();
      expect(it.stepBackward()).toEqual({
        position: { lineNumber: 1, column: 1 },
        type: 'method',
        value: 'POST',
      });
      // Walk over the end of the file.
      expect(it.stepBackward()).toBeNull();
      expect(it.stepForward()).toEqual({
        position: { lineNumber: 1, column: 5 },
        value: ' ',
        type: 'whitespace',
      });
    });
  });

  describe('detecting current position', () => {
    it('knows what is at the current position #1', () => {
      const it = new TokenIterator(tokensProvider, { lineNumber: 1, column: 6 });
      expect(it.getCurrentPosition()).toEqual({ lineNumber: 1, column: 5 });
      expect(it.getCurrentToken()).toEqual({
        position: { lineNumber: 1, column: 5 },
        type: 'whitespace',
        value: ' ',
      });
    });
  });
});
