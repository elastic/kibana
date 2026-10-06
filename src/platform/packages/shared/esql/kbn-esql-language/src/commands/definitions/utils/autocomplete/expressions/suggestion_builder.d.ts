/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../registry/types';
import type {
  FunctionParameter,
  FunctionParameterType,
  FunctionDefinitionTypes,
  SupportedDataType,
} from '../../../types';
import type { ExpressionContext } from './types';
import type { PreferredExpressionType } from './types';
import { type CommaContext } from './comma_decision_engine';
/** Builder pattern to eliminate duplicated field/function/literal suggestion code. */
export declare class SuggestionBuilder {
  private suggestions;
  private readonly context;
  constructor(context: ExpressionContext);
  addFields(options?: {
    types?: FunctionParameterType[];
    ignoredColumns?: string[];
    addComma?: boolean;
    addSpaceAfterField?: boolean;
    openSuggestions?: boolean;
    values?: boolean;
    canBeMultiValue?: boolean;
  }): Promise<this>;
  addFunctions(options?: {
    types?: FunctionParameterType[];
    addComma?: boolean;
    addSpaceAfterFunction?: boolean;
    constantGeneratingOnly?: boolean;
    excludeParentFunctions?: boolean;
    functionTypes?: FunctionDefinitionTypes[];
  }): this;
  addLiterals(options?: {
    types?: FunctionParameterType[];
    addComma?: boolean;
    includeDateLiterals?: boolean;
    includeCompatibleLiterals?: boolean;
    advanceCursorAndOpenSuggestions?: boolean;
  }): this;
  /** Adds suggestions for constant-only parameters (literals, constant functions, placeholder, control) */
  addConstants(options: {
    paramDefinitions: FunctionParameter[];
    shouldAddComma: boolean;
    hasMoreMandatoryArgs: boolean;
    preferredPlaceholderType?: SupportedDataType | 'unknown';
    includeValuesControl?: boolean;
    includeConstantFunctions?: boolean;
  }): this;
  addOperators(options?: {
    leftParamType?: FunctionParameterType;
    allowed?: string[];
    ignored?: string[];
    returnTypes?: PreferredExpressionType[];
  }): this;
  /**
   * Adds comma suggestion based on decision engine rules.
   */
  addCommaIfNeeded(commaContext: CommaContext): this;
  addSuggestions(suggestions: ISuggestionItem[]): this;
  build(): ISuggestionItem[];
  /**
   * Returns definitions to exclude from suggestions by merging three sources:
   * 1. Command-level ignored definitions (e.g., EVAL hides match_phrase)
   *    - Applies exceptions: if current parent function is in allowedInsideFunctions, the function is not ignored
   * 2. Full-text definitions inside function parameters
   *    - Full-text definitions cannot be nested in functions unless allowedInsideFunctions says otherwise
   * 3. Parent function names for recursion prevention (e.g., ABS inside ABS)
   *    - Only included when excludeParentFunctions=true
   */
  private resolveIgnoredDefinitions;
}
