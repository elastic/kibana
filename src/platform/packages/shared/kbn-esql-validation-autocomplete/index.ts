/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { SuggestionRawDefinition, ItemKind } from './src/autocomplete/types';
export { ESQLVariableType, type ESQLControlVariable } from './src/shared/types';
export type { CodeAction } from './src/code_actions/types';
export type {
  FunctionDefinition,
  CommandDefinition,
  CommandOptionsDefinition,
  CommandModeDefinition,
  Literals,
} from './src/definitions/types';
export type { ESQLCallbacks } from './src/shared/types';

/**
 * High level functions
 */

// Given an the query string, its AST and the cursor position, it returns the node and some context information
export { getAstContext } from './src/shared/context';
// Validation function
export { validateQuery } from './src/validation/validation';
// Autocomplete function
export { suggest } from './src/autocomplete/autocomplete';
// Quick fixes function
export { getActions } from './src/code_actions/actions';

/**
 * Some utility functions that can be useful to build more feature
 * for the ES|QL language
 */
export type {
  ValidationErrors,
  ESQLVariable,
  ESQLRealField,
  ESQLPolicy,
  ErrorTypes as ESQLValidationErrorTypes,
} from './src/validation/types';
export { collectVariables } from './src/shared/variables';
export {
  getAllFunctions,
  isSupportedFunction,
  getFunctionDefinition,
  getCommandDefinition,
  getAllCommands,
  getCommandOption,
  getColumnForASTNode as lookupColumn,
  shouldBeQuotedText,
  printFunctionSignature,
  checkFunctionArgMatchesDefinition as isEqualType,
  isSourceItem,
  isSettingItem,
  isFunctionItem,
  isOptionItem,
  isColumnItem,
  isLiteralItem,
  isTimeIntervalItem,
  isAssignment,
  isAssignmentComplete,
  isSingleItem,
} from './src/shared/helpers';
export { ENRICH_MODES } from './src/definitions/settings';
export { timeUnits } from './src/definitions/literals';
export { aggregationFunctionDefinitions } from './src/definitions/generated/aggregation_functions';
export { getFunctionSignatures } from './src/definitions/helpers';

export {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from './src/shared/resources_helpers';

export { wrapAsEditorMessage } from './src/code_actions/utils';

export { getRecommendedQueries } from './src/autocomplete/recommended_queries/templates';
