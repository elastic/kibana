/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';
import { default as PainlessLexer } from '../../antlr/painless_lexer';

/*
 * This extends the PainlessLexer class in order to handle backslashes appropriately
 * It is being invoked in painless_lexer.g4
 * Based on the Java implementation: https://github.com/elastic/elasticsearch/blob/feab123ba400b150f3dcd04dd27cf57474b70d5a/modules/lang-painless/src/main/java/org/elasticsearch/painless/antlr/EnhancedPainlessLexer.java#L73
 */
export class PainlessLexerEnhanced extends PainlessLexer {
  private lastToken?: Token;

  nextToken(): Token {
    this.lastToken = super.nextToken();

    return this.lastToken;
  }

  isSlashRegex(): boolean {
    switch (this.lastToken?.type) {
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
