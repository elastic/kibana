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

import { TokenIteratorImpl } from './token_iterator';
import { Position, Token, TokensProvider } from '../../interfaces';

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
  // describe('detecting current position', () => {

  //   it.only('knows what is at the current position #1', () => {
  //     const it = new TokenIteratorImpl(tokenProvider, { lineNumber: 4, column: 3 });
  //     expect(it.getCurrentPosition()).toEqual({ lineNumber: 4, column: 3 });
  //     expect(it.getCurrentToken()).toEqual({
  //       position: { lineNumber: 4, column: 3 },
  //       type: 'paren.lparen',
  //       value: '{',
  //     });
  //   });
  //
  //   it('knows what is at the current position #2', () => {
  //     const input = `POST abc
  //
  //
  // {  "abcd": 1`;
  //     const it = new TokenIteratorImpl(input, { lineNumber: 4, column: 8 });
  //     expect(it.getCurrentPosition()).toEqual({ lineNumber: 4, column: 8 });
  //     expect(it.getCurrentToken()).toEqual({
  //       position: { lineNumber: 4, column: 6 },
  //       type: 'variable',
  //       value: '"abcd"',
  //     });
  //     // Call again to make sure that we haven't broken anything by calculating current position
  //     expect(it.getCurrentToken()).toEqual({
  //       position: { lineNumber: 4, column: 6 },
  //       type: 'variable',
  //       value: '"abcd"',
  //     });
  //
  //     it.stepForward();
  //     it.stepBackward();
  //
  //     expect(it.getCurrentToken()).toEqual({
  //       position: { lineNumber: 4, column: 6 },
  //       type: 'variable',
  //       value: '"abcd"',
  //     });
  //     // We step to the start column of a token
  //     expect(it.getCurrentPosition()).toEqual({ lineNumber: 4, column: 6 });
  //   });
  //
  //   it('gets the current token', () => {
  //     const input = `POST abc`;
  //     const it = new TokenIteratorImpl(input);
  //
  //     expect(it.getCurrentToken()).toEqual({
  //       position: { lineNumber: 1, column: 1 },
  //       value: 'POST',
  //       type: 'method',
  //     });
  //
  //     expect(it.getCurrentPosition()).toEqual({
  //       lineNumber: 1,
  //       column: 1,
  //     });
  //   });
  //
  //   it('recovers gracefully from bad starting positions', () => {
  //     const input = `POST abc`;
  //     const it = new TokenIteratorImpl(input, { lineNumber: 1000, column: 1000 });
  //     // Nothing this way...
  //     expect(it.stepForward()).toBeNull();
  //     // We are at the end
  //     expect(it.getCurrentToken()).toEqual({
  //       position: { column: 6, lineNumber: 1 },
  //       type: 'url.part',
  //       value: 'abc',
  //     });
  //     expect(it.stepForward()).toBeNull();
  //   });
  // });
  //
  // describe('edge cases', () => {
  //   it('recovers from being past the last line', () => {
  //     const input = `POST abc`;
  //     const it = new TokenIteratorImpl(input, { lineNumber: 1000, column: 1000 });
  //     expect(it.getCurrentToken()).toBeNull();
  //     expect(it.stepBackward()).toEqual({
  //       position: { column: 6, lineNumber: 1 },
  //       type: 'url.part',
  //       value: 'abc',
  //     });
  //   });
  //
  //   it('recovers from being before the first line', () => {
  //     const input = `POST abc`;
  //     const it = new TokenIteratorImpl(input, { lineNumber: -1000, column: -1000 });
  //     expect(it.getCurrentToken()).toBeNull();
  //     expect(it.stepForward()).toEqual({
  //       position: { column: 1, lineNumber: 1 },
  //       type: 'method',
  //       value: 'POST',
  //     });
  //   });
  // });

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
    const it = new TokenIteratorImpl(tokensProvider, { lineNumber: 1, column: 1 });
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

  // it('iterates backwards', () => {
  //   const input = `POST abc`;
  //   const it = new TokenIteratorImpl(input);
  //   expect(it.stepBackward()).toBeNull();
  //   it.stepForward();
  //   expect(it.stepBackward()).toEqual({
  //     position: { lineNumber: 1, column: 1 },
  //     value: 'POST',
  //     type: 'method',
  //   });
  // });
});
