/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLVariableType } from '@kbn/esql-types';
import type { ESQLAstAllCommands, ESQLSingleAstItem } from '@elastic/esql/types';
import type {
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
  Location,
} from '../../../../registry/types';
import type {
  FunctionDefinition,
  FunctionDefinitionTypes,
  FunctionParameter,
  FunctionParameterType,
  ParameterHint,
  Signature,
  SupportedDataType,
} from '../../../types';
import type { ExpressionPosition } from './position';
export type PreferredExpressionType = SupportedDataType | 'any';
export type ParenthesizedExpressionPosition = 'inside' | 'after';
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
  parenthesizedExpressionPosition?: ParenthesizedExpressionPosition;
  position?: ExpressionPosition;
  location: Location;
  command: ESQLAstAllCommands;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  options: ExpressionContextOptions;
}
export interface ExpressionContextOptions {
  functionParameterContext?: FunctionParameterContext;
  preferredExpressionType?: PreferredExpressionType | PreferredExpressionType[];
  addSpaceAfterFirstField?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
  isCursorFollowedByComma?: boolean;
  isCursorFollowedByParens?: boolean;
  suggestFields?: boolean;
  suggestFunctions?: boolean;
  controlType?: ESQLVariableType;
  addSpaceAfterOperator?: boolean;
  openSuggestions?: boolean;
  allowSubquery?: boolean;
  getFunctionsToIgnore?: (functionParameterContext?: FunctionParameterContext) =>
    | {
        names: string[];
        allowedInsideFunctions?: Record<string, string[]>;
      }
    | undefined;
  parentFunctionNames?: string[];
}
export interface FunctionParameterContext {
  signatures: Signature[];
  paramDefinitions: FunctionParameter[];
  hasMoreMandatoryArgs: boolean;
  functionDefinition?: FunctionDefinition;
  firstArgumentType?: SupportedDataType | 'unknown';
  firstValueType?: SupportedDataType | 'unknown';
  currentParameterIndex: number;
  validSignatures?: Signature[];
}
export interface PartialOperatorDetection {
  operatorName: string;
  textBeforeCursor?: string;
}
export interface ParamDefinition {
  type: FunctionParameterType;
  hint?: ParameterHint;
  fieldsOnly?: boolean;
  name?: string;
}
export interface FunctionDef {
  name: string;
  type: FunctionDefinitionTypes;
  signatures?: Array<{
    params: Array<{
      type: FunctionParameterType;
      name?: string;
    }>;
    minParams?: number;
    returnType?: string;
  }>;
}
export interface ExpressionComputedMetadata {
  innerText: string;
  position: ExpressionPosition;
  expressionType: SupportedDataType | 'unknown';
  isComplete: boolean;
  insideFunction: boolean;
}
export interface SuggestForExpressionResult {
  suggestions: ISuggestionItem[];
  computed: ExpressionComputedMetadata;
}
