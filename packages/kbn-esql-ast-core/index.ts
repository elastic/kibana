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
  ESQLCommand,
  ESQLCommandOption,
  ESQLCommandMode,
  ESQLFunction,
  ESQLTimeInterval,
  ESQLLocation,
  ESQLMessage,
  AstProviderFn,
} from './src/lib/ast/types';
export type { EditorError } from './src/lib/types';
export type { SuggestionRawDefinition } from './src/lib/ast/autocomplete/types';
export type { CodeAction } from './src/lib/ast/code_actions/types';
export type {
  FunctionDefinition,
  CommandDefinition,
  CommandOptionsDefinition,
  CommandModeDefinition,
  Literals,
} from './src/lib/ast/definitions/types';
export type { ESQLCallbacks } from './src/lib/ast/shared/types';

// Low level functions to parse grammar
export { getParser, getLexer, ROOT_STATEMENT } from './src/lib/antlr_facade';

/**
 * ES|QL Query string -> AST data structure
 * this is the foundational building block for any advanced feature
 * a developer wants to build on top of the ESQL language
 **/
export { getAstAndSyntaxErrors } from './src/lib/ast/ast_parser';

/**
 * High level functions
 */

// Given an the query string, its AST and the cursor position, it returns the node and some context information
export { getAstContext } from './src/lib/ast/shared/context';
// Validation function
export { validateAst } from './src/lib/ast/validation/validation';
// Autocomplete function
export { suggest } from './src/lib/ast/autocomplete/autocomplete';
// Quick fixes function
export { getActions } from './src/lib/ast/code_actions/actions';

/**
 * Some utility functions that can be useful to build more feature
 * for the ES|QL language
 */
export type {
  ValidationErrors,
  ESQLVariable,
  ESQLRealField,
  ESQLPolicy,
} from './src/lib/ast/validation/types';
export { ESQLErrorListener } from './src/lib/antlr_error_listener';
export { collectVariables } from './src/lib/ast/shared/variables';
export {
  getAllFunctions,
  isSupportedFunction,
  getFunctionDefinition,
  getCommandDefinition,
  getAllCommands,
  getCommandOption,
  getColumnHit,
  columnExists,
  shouldBeQuotedText,
  printFunctionSignature,
  isEqualType,
  isSourceItem,
  isSettingItem,
  isFunctionItem,
  isOptionItem,
  isColumnItem,
  isLiteralItem,
  isTimeIntervalItem,
  isAssignment,
  isExpression,
  isAssignmentComplete,
  isSingleItem,
} from './src/lib/ast/shared/helpers';
export { ENRICH_MODES } from './src/lib/ast/definitions/settings';
export { getFunctionSignatures } from './src/lib/ast/definitions/helpers';

export {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from './src/lib/ast/shared/resources_helpers';
