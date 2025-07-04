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
  ESQLAstTimeseriesCommand,
  ESQLAstJoinCommand,
  ESQLCommand,
  ESQLCommandOption,
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
  EditorError,
  ESQLAstNode,
  ESQLInlineCast,
  ESQLAstBaseItem,
  ESQLAstChangePointCommand,
} from './src/types';

export * from './src/ast/is';

export { Builder, type AstNodeParserFields, type AstNodeTemplate } from './src/builder';

export {
  createParser,
  parse,
  Parser,
  parseErrors,
  type ParseOptions,
  type ParseResult,
  ESQLErrorListener,
} from './src/parser';

export { Walker, type WalkerOptions, walk, type WalkerAstNode } from './src/walker';
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

export { singleItems, resolveItem, lastItem, firstItem } from './src/visitor/utils';
