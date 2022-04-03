/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
// @ts-expect-error Not available with types
import babelParserOptions from '@kbn/babel-preset/common_babel_parser_options';

import { importVisitor } from './import_visitor';

/**
 * Parse the code and return an array of all the import requests in that file
 */
export function getImportRequests(code: string) {
  const importRequests: string[] = [];

  // Parse and get the code AST
  const ast = parser.parse(code, babelParserOptions);

  // Loop through the code AST with
  // the defined visitors
  traverse(ast, importVisitor(importRequests));

  return importRequests;
}
