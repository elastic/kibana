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
  ESQLAstJoinCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLTimeSpanLiteral,
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
  ESQLAstForkCommand,
  ESQLForkParens,
} from './src/types';

export * from './src/ast/is';
export * from './src/ast/location';

export { Builder, type AstNodeParserFields, type AstNodeTemplate } from './src/builder';

export * from './src/parser';

export { Walker, type WalkerOptions, walk, type WalkerAstNode } from './src/walker';

export * as synth from './src/synth';
export { qry, cmd, exp } from './src/synth';
export * from './src/composer';

export { esql, e } from './src/composer/esql';

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

export * from './src/commands';
// temporary export to ease migration
export { getNoValidCallSignatureError } from './src/commands/definitions/utils/validation/utils';

export { SuggestionOrderingEngine } from './src/sorting';
export { SuggestionCategory } from './src/sorting';
export type { SortingContext } from './src/sorting';
