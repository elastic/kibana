/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  getLexer,
  getParser,
  createParser,
  parse,
  type ParseOptions,
  type ParseResult,

  /** @deprecated Use `parse` instead. */
  parse as getAstAndSyntaxErrors,
} from './parser';

export { ESQLErrorListener } from './esql_error_listener';
