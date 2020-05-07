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

import { IEditSession, TokenInfo as BraceTokenInfo } from 'brace';
import { TokensProvider, Token, Position } from '../../types';

// Brace's token information types are not accurate.
interface TokenInfo extends BraceTokenInfo {
  type: string;
}

const toToken = (lineNumber: number, column: number, token: TokenInfo): Token => ({
  type: token.type,
  value: token.value,
  position: {
    lineNumber,
    column,
  },
});

const toTokens = (lineNumber: number, tokens: TokenInfo[]): Token[] => {
  let acc = '';
  return tokens.map(token => {
    const column = acc.length + 1;
    acc += token.value;
    return toToken(lineNumber, column, token);
  });
};

const extractTokenFromAceTokenRow = (
  lineNumber: number,
  column: number,
  aceTokens: TokenInfo[]
) => {
  let acc = '';
  for (const token of aceTokens) {
    const start = acc.length + 1;
    acc += token.value;
    const end = acc.length;
    if (column < start) continue;
    if (column > end + 1) continue;
    return toToken(lineNumber, start, token);
  }
  return null;
};

export class AceTokensProvider implements TokensProvider {
  constructor(private readonly session: IEditSession) {}

  getTokens(lineNumber: number): Token[] | null {
    if (lineNumber < 1) return null;

    // Important: must use a .session.getLength because this is a cached value.
    // Calculating line length here will lead to performance issues because this function
    // may be called inside of tight loops.
    const lineCount = this.session.getLength();
    if (lineNumber > lineCount) {
      return null;
    }

    const tokens: TokenInfo[] = this.session.getTokens(lineNumber - 1) as any;
    if (!tokens || !tokens.length) {
      // We are inside of the document but have no tokens for this line. Return an empty
      // array to represent this empty line.
      return [];
    }

    return toTokens(lineNumber, tokens);
  }

  getTokenAt(pos: Position): Token | null {
    const tokens: TokenInfo[] = this.session.getTokens(pos.lineNumber - 1) as any;
    if (tokens) {
      return extractTokenFromAceTokenRow(pos.lineNumber, pos.column, tokens);
    }
    return null;
  }
}
