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
import { shouldSuggestComma, type CommaContext } from './commaDecisionEngine';
import { getCompatibleLiterals } from '../../literals';
import { ensureKeywordAndText } from '../functions';
import { SignatureAnalyzer } from './SignatureAnalyzer';


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

  }): Promise<this> {
    const types = options?.types ?? ['any'];
    const addComma = options?.addComma ?? false;
    const addSpaceAfterField = options?.addSpaceAfterField ?? addComma;
    const promoteToTop = options?.promoteToTop ?? true;
    const ignoredColumns = options?.ignoredColumns ?? [];
    const openSuggestions = options?.openSuggestions ?? true;
    const values = options?.values;

    const getByType = this.context.callbacks?.getByType ?? (() => Promise.resolve([]));

    const fieldSuggestions = await getFieldsSuggestions(types, getByType, {
      ignoreColumns: ignoredColumns,
      addSpaceAfterField,
      openSuggestions,
      addComma,
      promoteToTop,
      values,
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
  }): this {
    const types = options?.types ?? ['any'];
    const ignored = options?.ignoredFunctions ?? [];
    const addSpaceAfterFunction = options?.addSpaceAfterFunction;
    const openSuggestions = options?.openSuggestions;


    const functionSuggestions = getFunctionsSuggestions({
      location: this.context.location,
      types,
      options: {
        ignored,
        addComma: options?.addComma,
        addSpaceAfterFunction,
        openSuggestions,
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

  /**
   * Handles suggestions for unknown type expressions within function parameters.
   */
  async addUnknownTypeSuggestions(): Promise<this> {
    const { context, options } = this.context;
    const { functionParameterContext } = options;

    if (!functionParameterContext?.functionDefinition) {
      return this;
    }

    const {
      paramDefinitions,
      hasMoreMandatoryArgs = false,
      functionsToIgnore,
    } = functionParameterContext;

    const constantOnlyParamDefs = paramDefinitions.filter(({ constantOnly }) => constantOnly);
    const nonConstantParamDefs = paramDefinitions.filter(({ constantOnly }) => !constantOnly);

    if (constantOnlyParamDefs.length > 0) {
      const literalTypes = ensureKeywordAndText(constantOnlyParamDefs.map(({ type }) => type));
      this.suggestions.push(
        ...getCompatibleLiterals(
          literalTypes,
          { supportsControls: context?.supportsControls },
          context?.variables
        )
      );
    }

    if (
      paramDefinitions.length === 0 ||
      nonConstantParamDefs.length > 0 ||
      paramDefinitions.every(({ constantOnly }) => constantOnly)
    ) {
      const analyzer = SignatureAnalyzer.from(functionParameterContext);
      const acceptedTypes = analyzer
        ? analyzer.getAcceptedTypes()
        : ensureKeywordAndText(paramDefinitions.map(({ type }) => type));

      await this.addFields({
        types: acceptedTypes,
        addComma: hasMoreMandatoryArgs,
        promoteToTop: true,
      });

      this.addFunctions({
        types: acceptedTypes,
        ignoredFunctions: functionsToIgnore,
      });
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
