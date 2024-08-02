/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  ESQLAst,
  ESQLAstItem,
  ESQLAstCommand,
  ESQLAstMetricsCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLCommandMode,
  ESQLFunction,
  ESQLTimeInterval,
  ESQLLocation,
  ESQLMessage,
  ESQLSingleAstItem,
  ESQLSource,
  ESQLColumn,
  ESQLLiteral,
  ESQLParamLiteral,
  AstProviderFn,
  EditorError,
  ESQLAstNode,
} from './src/types';

// Low level functions to parse grammar
export { getParser, getLexer, ROOT_STATEMENT } from './src/antlr_facade';

/**
 * ES|QL Query string -> AST data structure
 * this is the foundational building block for any advanced feature
 * a developer wants to build on top of the ESQL language
 **/
export { getAstAndSyntaxErrors } from './src/ast_parser';

export { ESQLErrorListener } from './src/antlr_error_listener';

export { Walker, type WalkerOptions, walk } from './src/walker';
