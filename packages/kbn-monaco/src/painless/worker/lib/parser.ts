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

import { CommonTokenStream, CharStreams } from 'antlr4ts';
import { painless_parser as PainlessParser, SourceContext } from '../../antlr/painless_parser';
import { PainlessError, PainlessErrorListener } from './error_listener';
import { PainlessLexerEnhanced } from './lexer';

const parse = (
  code: string
): {
  source: SourceContext;
  errors: PainlessError[];
} => {
  const inputStream = CharStreams.fromString(code);
  const lexer = new PainlessLexerEnhanced(inputStream);
  const painlessLangErrorListener = new PainlessErrorListener();
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new PainlessParser(tokenStream);

  lexer.removeErrorListeners();
  parser.removeErrorListeners();

  lexer.addErrorListener(painlessLangErrorListener);
  parser.addErrorListener(painlessLangErrorListener);

  const errors: PainlessError[] = painlessLangErrorListener.getErrors();

  return {
    source: parser.source(),
    errors,
  };
};

export const parseAndGetSyntaxErrors = (code: string): PainlessError[] => {
  const { errors } = parse(code);
  return errors;
};
