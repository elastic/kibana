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

import { CommonTokenStream, CharStream, CharStreams } from 'antlr4ts';
import { PainlessParser } from '../antlr/PainlessParser';
import { PainlessLexer } from '../antlr/PainlessLexer';
import { PainlessError, PainlessErrorService } from './lib';

class PainlessLexerEnhanced extends PainlessLexer {
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

const parse = (code: string) => {
  const inputStream = CharStreams.fromString(code);
  const lexer = new PainlessLexerEnhanced(inputStream);
  // @ts-ignore
  lexer.removeErrorListeners();
  const painlessLangErrorListener = new PainlessErrorService();
  // @ts-ignore
  lexer.addErrorListener(painlessLangErrorListener);
  // @ts-ignore
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new PainlessParser(tokenStream);
  // @ts-ignore
  parser.removeErrorListeners();
  // @ts-ignore
  parser.addErrorListener(painlessLangErrorListener);
  const errors: PainlessError[] = painlessLangErrorListener.getErrors();

  return {
    ast: parser.source(),
    errors,
  };
};

export function parseAndGetAST(code: string) {
  const { ast } = parse(code);
  return ast;
}

export function parseAndGetSyntaxErrors(code: string): PainlessError[] {
  const { errors } = parse(code);
  return errors;
}
