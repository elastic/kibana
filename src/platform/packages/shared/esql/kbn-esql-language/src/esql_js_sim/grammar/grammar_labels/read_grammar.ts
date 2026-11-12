/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { Parser } from '@elastic/esql';
import { extractGrammarLabels, type Atn } from './extract_grammar_labels';
import type { GrammarLabel } from './types';

/**
 * Extracts the labels from the installed grammar (Node only). The generated parser ships in
 * `@elastic/esql-grammar`, a dependency of `@elastic/esql`, so it is read as a file.
 */
export const readGrammarLabels = (): GrammarLabel[] => {
  const parserPath = require.resolve('@elastic/esql-grammar', {
    paths: [dirname(require.resolve('@elastic/esql'))],
  });
  const { parser } = Parser.create('');

  return extractGrammarLabels(readFileSync(parserPath, 'utf8'), {
    // `atn` exists on every antlr4 recognizer at runtime but is missing from its typings.
    atn: (parser as unknown as { atn: Atn }).atn,
    ruleNames: parser.ruleNames,
    symbolicNames: parser.symbolicNames,
  });
};
