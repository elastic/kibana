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

import { IEditSession, TokenInfo } from 'brace';
import { TokensProvider, Token, Position } from '../../interfaces';

interface ActualTokenInfo extends TokenInfo {
  type: string;
}

const toToken = (lineNumber: number, tokens: ActualTokenInfo[]): Token[] => {
  let acc = '';
  return tokens.map(token => {
    const column = acc.length + 1;
    acc += token.value || '';
    return {
      type: token.type,
      value: token.value,
      position: {
        lineNumber,
        column,
      },
    };
  });
};

export class AceTokensProvider implements TokensProvider {
  constructor(private readonly session: IEditSession) {}

  getTokens(lineNumber: number): Token[] | null {
    if (lineNumber < 1) return null;
    const tokens: ActualTokenInfo[] = this.session.getTokens(lineNumber - 1) as any;
    if (!tokens || !tokens.length) {
      const lineCount = this.session.doc.getAllLines().length;
      if (lineNumber > 0 && lineCount > lineNumber) {
        // Special case
        return [];
      }
      return null;
    }
    return toToken(lineNumber, tokens);
  }

  getTokenAt(pos: Position): Token | null {
    const token: ActualTokenInfo = this.session.getTokenAt(
      pos.lineNumber - 1,
      pos.column - 1
    ) as any;
    return token ? toToken(pos.lineNumber, [token])[0] : null;
  }
}
