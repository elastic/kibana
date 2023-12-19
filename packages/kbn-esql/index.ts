/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Raw definitions
 */
export { commandDefinitions } from './src/lib/definitions/commands';
export { builtinFunctions } from './src/lib/definitions/builtin';
export { statsAggregationFunctionDefinitions } from './src/lib/definitions/aggs';
export { evalFunctionsDefinitions } from './src/lib/definitions/functions';
export { chronoLiterals, timeLiterals } from './src/lib/definitions/literals';

/**
 * Utilities to build high level features
 */
export { EDITOR_MARKER } from './src/lib/shared/constants';
export { ESQL_LANG_ID, ESQL_THEME_ID, ESQL_TOKEN_POSTFIX } from './src/lib/constants';
export { getParser, getLexer, ROOT_STATEMENT } from './src/lib/antlr_facade';
// Specialized Error listener for ES|QL
export { ESQLErrorListener } from './src/lib/esql_error_listener';
export { AstListener } from './src/lib/ast/ast_factory';
// Useful to wrap callbacks with some caching mechanism
export {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from './src/lib/shared/resources_helpers';
export {
  columnExists,
  getColumnHit,
  getCommandDefinition,
  getCommandOption,
  getFunctionDefinition,
  isAssignment,
  isAssignmentComplete,
  isColumnItem,
  isFunctionItem,
  isIncompleteItem,
  isLiteralItem,
  isOptionItem,
  isRestartingExpression,
  isSourceItem,
  isTimeIntervalItem,
  monacoPositionToOffset,
  isBuiltinFunction,
  buildFunctionsLookupMap,
} from './src/lib/shared/helpers';
export { excludeVariablesFromCurrentCommand, collectVariables } from './src/lib/shared/variables';
export { getAstContext, removeMarkerArgFromArgsList } from './src/lib/shared/context';
export { getFunctionSignatures, getCommandSignature } from './src/lib/definitions/helpers';

/**
 * Types
 */
export type { EditorError } from './src/lib/types';
export type { ESQLCallbacks } from './src/lib/shared/types';
export type {
  FunctionDefinition,
  CommandDefinition,
  CommandOptionsDefinition,
} from './src/lib/definitions/types';
export type {
  ESQLPolicy,
  ESQLRealField,
  ESQLVariable,
  ReferenceMaps,
} from './src/lib/validation/types';
/**
 * Types for the middle AST data structure used by all ES|QL functions
 * like validation or autocomplete
 */
export type {
  AstProviderFn,
  ESQLAst,
  ESQLAstItem,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLSingleAstItem,
  ESQLMessage,
} from './src/lib/ast/types';

/**
 * Validation function
 */
export { validateAst } from './src/lib/validation/validation';
