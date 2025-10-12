/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../commands_registry/types';
import type { FunctionParameterType } from '../../../types';
import { getFieldsSuggestions, getFunctionsSuggestions, getLiteralsSuggestions } from '../helpers';
import type { ExpressionContext } from './types';

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
  }): Promise<this> {
    const types = options?.types ?? ['any'];
    const addComma = options?.addComma ?? false;
    const addSpaceAfterField = options?.addSpaceAfterField ?? addComma;
    const promoteToTop = options?.promoteToTop ?? true;
    const ignoredColumns = options?.ignoredColumns ?? [];

    const getByType = this.context.callbacks?.getByType ?? (() => Promise.resolve([]));

    const fieldSuggestions = await getFieldsSuggestions(types, getByType, {
      ignoreColumns: ignoredColumns,
      addSpaceAfterField,
      openSuggestions: true,
      addComma,
      promoteToTop,
    });

    this.suggestions.push(...fieldSuggestions);
    return this;
  }

  addFunctions(options?: {
    types?: FunctionParameterType[];
    ignoredFunctions?: string[];
    addComma?: boolean;
  }): this {
    const types = options?.types ?? ['any'];
    const ignored = options?.ignoredFunctions ?? [];

    const functionSuggestions = getFunctionsSuggestions({
      location: this.context.location,
      types,
      options: { ignored, addComma: options?.addComma },
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
  }): this {
    const types = options?.types ?? ['any'];
    const includeDateLiterals = options?.includeDateLiterals ?? true;
    const includeCompatibleLiterals = options?.includeCompatibleLiterals ?? true;

    const literals = getLiteralsSuggestions(types, this.context.location, {
      includeDateLiterals,
      includeCompatibleLiterals,
      addComma: options?.addComma,
      advanceCursorAndOpenSuggestions: false,
    });

    this.suggestions.push(...literals);
    return this;
  }

  /**
   * Returns the accumulated suggestions.
   */
  build(): ISuggestionItem[] {
    return this.suggestions;
  }
}
