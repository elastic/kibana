/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLVariableType } from '@kbn/esql-types';
import type {
  ICommandCallbacks,
  ICommandContext,
  Location,
} from '../../../../commands_registry/types';
import type { ESQLCommand, ESQLSingleAstItem } from '../../../../types';
import type {
  FunctionDefinition,
  FunctionParameter,
  Signature,
  SupportedDataType,
} from '../../../types';
import type { ExpressionPosition } from './position';

export interface SuggestForExpressionParams {
  query: string;
  expressionRoot?: ESQLSingleAstItem;
  command: ESQLCommand;
  cursorPosition: number;
  location: Location;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  options?: ExpressionContextOptions;
}

export interface ExpressionContext {
  query: string;
  cursorPosition: number;
  innerText: string;
  expressionRoot?: ESQLSingleAstItem;
  position?: ExpressionPosition;
  location: Location;
  command: ESQLCommand;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  options: ExpressionContextOptions;
}

export interface ExpressionContextOptions {
  functionParameterContext?: FunctionParameterContext;
  preferredExpressionType?: SupportedDataType;
  addSpaceAfterFirstField?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
  isCursorFollowedByComma?: boolean;
  suggestFields?: boolean;
  suggestFunctions?: boolean;
  controlType?: ESQLVariableType;
  addSpaceAfterOperator?: boolean;
  openSuggestions?: boolean;
  isInsideInList?: boolean; // Flag to indicate we're inside an IN operator list
}

export interface FunctionParameterContext {
  paramDefinitions: FunctionParameter[];
  functionsToIgnore: string[];
  // Flag to suggest comma after function parameters when more mandatory args exist
  hasMoreMandatoryArgs?: boolean;
  // Function definition for function-specific parameter handling (e.g., CASE function)
  functionDefinition?: FunctionDefinition;
  // Type of the first argument in the function (for homogenity type checking)
  firstArgumentType?: SupportedDataType | 'unknown';
  // Index of the current parameter being edited
  currentParameterIndex?: number;
  // Signaturres that match the already-given arguments
  validSignatures?: Signature[];
}
