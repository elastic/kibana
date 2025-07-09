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

export { esqlCommandRegistry } from './src/commands_registry';

export * from './src/commands_registry/utils/complete_items';
export * from './src/commands_registry/constants';
export * from './src/definitions/constants';
export * from './src/definitions/types';
export { METADATA_FIELDS } from './src/commands_registry/options/metadata';
export { TIME_SYSTEM_PARAMS } from './src/definitions/utils/literals';
