/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  ESQLAst,
  ESQLAstItem,
  ESQLAstCommand,
  ESQLAstMetricsCommand,
  ESQLAstJoinCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLCommandMode,
  ESQLFunction,
  ESQLTimeInterval,
  ESQLLocation,
  ESQLMessage,
  ESQLSingleAstItem,
  ESQLAstQueryExpression,
  ESQLSource,
  ESQLColumn,
  ESQLLiteral,
  ESQLParamLiteral,
  AstProviderFn,
  EditorError,
  ESQLAstNode,
} from './src/types';

export {
  isColumn,
  isDoubleLiteral,
  isFunctionExpression,
  isBinaryExpression,
  isWhereExpression,
  isFieldExpression,
  isSource,
  isIdentifier,
  isIntegerLiteral,
  isLiteral,
  isParamLiteral,
  isProperNode,
} from './src/ast/helpers';

export { Builder, type AstNodeParserFields, type AstNodeTemplate } from './src/builder';

export {
  getParser,
  createParser,
  getLexer,
  parse,
  parseErrors,
  type ParseOptions,
  type ParseResult,
  getAstAndSyntaxErrors,
  ESQLErrorListener,
} from './src/parser';

export { Walker, type WalkerOptions, walk } from './src/walker';
export * as synth from './src/synth';

export {
  LeafPrinter,
  BasicPrettyPrinter,
  type BasicPrettyPrinterMultilineOptions,
  type BasicPrettyPrinterOptions,
  WrappingPrettyPrinter,
  type WrappingPrettyPrinterOptions,
} from './src/pretty_print';

export { EsqlQuery } from './src/query';

export * as mutate from './src/mutate';
