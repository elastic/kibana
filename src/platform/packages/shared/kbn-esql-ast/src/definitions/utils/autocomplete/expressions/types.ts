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
import type { ESQLAstAllCommands, ESQLSingleAstItem } from '../../../../types';
import type {
  FunctionDefinition,
  FunctionDefinitionTypes,
  FunctionParameter,
  FunctionParameterType,
  Signature,
  SupportedDataType,
} from '../../../types';
import type { ExpressionPosition } from './position';

export interface SuggestForExpressionParams {
  query: string;
  expressionRoot?: ESQLSingleAstItem;
  command: ESQLAstAllCommands;
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
  command: ESQLAstAllCommands;
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
  firstArgumentType?: SupportedDataType | 'unknown';
  currentParameterIndex?: number;
  validSignatures?: Signature[];
}

export interface PartialOperatorDetection {
  operatorName: string;
  textBeforeCursor?: string;
}

export interface ParamDefinition {
  type: FunctionParameterType;
  constantOnly?: boolean;
  suggestedValues?: string[];
  fieldsOnly?: boolean;
  name?: string;
}

export interface FunctionDef {
  name: string;
  type: FunctionDefinitionTypes;
  signatures?: Array<{
    params: Array<{ type: FunctionParameterType; name?: string }>;
    minParams?: number;
    returnType?: string;
  }>;
}
