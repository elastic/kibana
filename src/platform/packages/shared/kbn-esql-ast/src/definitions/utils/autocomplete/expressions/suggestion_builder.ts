/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../commands_registry/types';
import type { FunctionParameterType, SupportedDataType } from '../../../types';
import { getFieldsSuggestions, getFunctionsSuggestions, getLiteralsSuggestions } from '../helpers';
import { getOperatorSuggestions } from '../../operators';
import type { ExpressionContext } from './types';
import { commaCompleteItem } from '../../../../commands_registry/complete_items';
import { shouldSuggestComma, type CommaContext } from './comma_decision_engine';

/** Builder pattern to eliminate duplicated field/function/literal suggestion code. */
export class SuggestionBuilder {
  private suggestions: ISuggestionItem[] = [];
  private readonly context: ExpressionContext;

  constructor(context: ExpressionContext) {
    this.context = context;
  }

  async addFields(options?: {
    types?: FunctionParameterType[];
    ignoredColumns?: string[];
    addComma?: boolean;
    addSpaceAfterField?: boolean;
    promoteToTop?: boolean;
    openSuggestions?: boolean;
    values?: boolean;
    canBeMultiValue?: boolean;
  }): Promise<this> {
    const types = options?.types ?? ['any'];
    const addComma = options?.addComma ?? false;
    const addSpaceAfterField = options?.addSpaceAfterField ?? addComma;
    const promoteToTop = options?.promoteToTop ?? true;
    const ignoredColumns = options?.ignoredColumns ?? [];
    const openSuggestions = options?.openSuggestions ?? (addSpaceAfterField || addComma);
    const values = options?.values;
    const canBeMultiValue = options?.canBeMultiValue ?? false;

    const getByType = this.context.callbacks?.getByType ?? (() => Promise.resolve([]));

    const fieldSuggestions = await getFieldsSuggestions(types, getByType, {
      ignoreColumns: ignoredColumns,
      addSpaceAfterField,
      openSuggestions,
      addComma,
      promoteToTop,
      values,
      canBeMultiValue,
    });

    this.suggestions.push(...fieldSuggestions);
    return this;
  }

  addFunctions(options?: {
    types?: FunctionParameterType[];
    ignoredFunctions?: string[];
    addComma?: boolean;
    addSpaceAfterFunction?: boolean;
    openSuggestions?: boolean;
    constantGeneratingOnly?: boolean;
  }): this {
    const types = options?.types ?? ['any'];
    const ignored = options?.ignoredFunctions ?? [];
    const addSpaceAfterFunction = options?.addSpaceAfterFunction;
    const openSuggestions = options?.openSuggestions;
    const constantGeneratingOnly = options?.constantGeneratingOnly ?? false;

    const functionSuggestions = getFunctionsSuggestions({
      location: this.context.location,
      types,
      options: {
        ignored,
        addComma: options?.addComma,
        addSpaceAfterFunction,
        openSuggestions,
        constantGeneratingOnly,
      },
      context: this.context.context,
      callbacks: {
        hasMinimumLicenseRequired: this.context.callbacks?.hasMinimumLicenseRequired,
      },
    });

    this.suggestions.push(...functionSuggestions);
    return this;
  }

  addLiterals(options?: {
    types?: FunctionParameterType[];
    addComma?: boolean;
    includeDateLiterals?: boolean;
    includeCompatibleLiterals?: boolean;
    advanceCursorAndOpenSuggestions?: boolean;
  }): this {
    const types = options?.types ?? ['any'];
    const includeDateLiterals = options?.includeDateLiterals ?? true;
    const includeCompatibleLiterals = options?.includeCompatibleLiterals ?? true;
    const advanceCursorAndOpenSuggestions = options?.advanceCursorAndOpenSuggestions ?? false;

    const literals = getLiteralsSuggestions(types, this.context.location, {
      includeDateLiterals,
      includeCompatibleLiterals,
      addComma: options?.addComma,
      advanceCursorAndOpenSuggestions,
      supportsControls: this.context.context?.supportsControls,
      variables: this.context.context?.variables,
    });

    this.suggestions.push(...literals);
    return this;
  }

  addOperators(options?: {
    leftParamType?: FunctionParameterType;
    allowed?: string[];
    ignored?: string[];
    returnTypes?: SupportedDataType[];
  }): this {
    const operatorSuggestions = getOperatorSuggestions(
      {
        location: this.context.location,
        leftParamType: options?.leftParamType,
        allowed: options?.allowed,
        ignored: options?.ignored,
        returnTypes: options?.returnTypes,
      },
      this.context.callbacks?.hasMinimumLicenseRequired,
      this.context.context?.activeProduct
    );

    this.suggestions.push(...operatorSuggestions);
    return this;
  }

  /**
   * Adds comma suggestion based on decision engine rules.
   */
  addCommaIfNeeded(commaContext: CommaContext): this {
    if (shouldSuggestComma(commaContext)) {
      this.suggestions.push(commaCompleteItem);
    }

    return this;
  }

  addSuggestions(suggestions: ISuggestionItem[]): this {
    this.suggestions.push(...suggestions);
    return this;
  }

  build(): ISuggestionItem[] {
    return this.suggestions;
  }
}
