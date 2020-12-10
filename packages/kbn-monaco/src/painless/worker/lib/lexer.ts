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

import { CharStream } from 'antlr4ts';
import { painless_lexer as PainlessLexer } from '../../antlr/painless_lexer';

/*
 * This extends the PainlessLexer class in order to handle backslashes appropriately
 * It is being invoked in painless_lexer.g4
 * Based on the Java implementation: https://github.com/elastic/elasticsearch/blob/feab123ba400b150f3dcd04dd27cf57474b70d5a/modules/lang-painless/src/main/java/org/elasticsearch/painless/antlr/EnhancedPainlessLexer.java#L73
 */
export class PainlessLexerEnhanced extends PainlessLexer {
  constructor(input: CharStream) {
    super(input);
  }

  isSlashRegex(): boolean {
    const lastToken = super.nextToken();

    if (lastToken == null) {
      return true;
    }

    // @ts-ignore
    switch (lastToken._type) {
      case PainlessLexer.RBRACE:
      case PainlessLexer.RP:
      case PainlessLexer.OCTAL:
      case PainlessLexer.HEX:
      case PainlessLexer.INTEGER:
      case PainlessLexer.DECIMAL:
      case PainlessLexer.ID:
      case PainlessLexer.DOTINTEGER:
      case PainlessLexer.DOTID:
        return false;
      default:
        return true;
    }
  }
}
