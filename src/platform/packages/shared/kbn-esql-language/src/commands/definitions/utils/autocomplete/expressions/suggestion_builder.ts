/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlTriggerSource, ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type {
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
} from '../../../../registry/types';
import { Location } from '../../../../registry/types';
import type {
  FunctionParameter,
  FunctionParameterType,
  FunctionDefinitionTypes,
  SupportedDataType,
} from '../../../types';
import { FULL_TEXT_SEARCH_DEFINITIONS } from '../../../constants';
import { getControlSuggestionIfSupported, getFieldsSuggestions, withAutoSuggest } from '../helpers';
import { getOperatorSuggestions } from '../../operators';
import { getCompatibleLiterals, getDateLiterals } from '../../literals';
import { filterFunctionDefinitions, getAllFunctions, getFunctionSuggestion } from '../../functions';
import { isConstantParameter, pairKeywordAndTextTypes } from '../../signatures';
import type { ExpressionContext } from './types';
import type { PreferredExpressionType } from './types';
import {
  buildAddValuePlaceholder,
  commaCompleteItem,
  findConstantPlaceholderType,
} from '../../../../registry/complete_items';
import { shouldSuggestComma, type CommaContext } from './comma_decision_engine';

interface FunctionSuggestionOptions {
  ignored?: string[];
  addComma?: boolean;
  addSpaceAfterFunction?: boolean;
  constantGeneratingOnly?: boolean;
  suggestOnlyName?: boolean;
  functionTypes?: FunctionDefinitionTypes[];
}

interface GetFunctionsSuggestionsParams {
  location: Location;
  types: (SupportedDataType | 'unknown' | 'any')[];
  options?: FunctionSuggestionOptions;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
}

interface LiteralSuggestionsOptions {
  includeDateLiterals?: boolean;
  includeCompatibleLiterals?: boolean;
  addComma?: boolean;
  advanceCursorAndOpenSuggestions?: boolean;
  supportsControls?: boolean;
  variables?: ESQLControlVariable[];
}

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
    openSuggestions?: boolean;
    values?: boolean;
    canBeMultiValue?: boolean;
  }): Promise<this> {
    const types = options?.types ?? ['any'];
    const addComma = options?.addComma ?? false;
    const addSpaceAfterField = options?.addSpaceAfterField ?? addComma;
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
      values,
      canBeMultiValue,
    });

    this.suggestions.push(...fieldSuggestions);
    return this;
  }

  addFunctions(options?: {
    types?: FunctionParameterType[];
    addComma?: boolean;
    addSpaceAfterFunction?: boolean;
    constantGeneratingOnly?: boolean;
    excludeParentFunctions?: boolean;
    functionTypes?: FunctionDefinitionTypes[];
  }): this {
    const types = options?.types ?? ['any'];
    const excludeParentFunctions = options?.excludeParentFunctions ?? false;
    const ignored = this.resolveIgnoredDefinitions(excludeParentFunctions);
    const addSpaceAfterFunction = options?.addSpaceAfterFunction;
    const constantGeneratingOnly = options?.constantGeneratingOnly ?? false;

    const functionSuggestions = getFunctionsSuggestions({
      location: this.context.location,
      types,
      options: {
        ignored,
        addComma: options?.addComma,
        suggestOnlyName: this.context.options.isCursorFollowedByParens,
        addSpaceAfterFunction,
        constantGeneratingOnly,
        functionTypes: options?.functionTypes,
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

  /** Adds suggestions for constant-only parameters (literals, constant functions, placeholder, control) */
  addConstants(options: {
    paramDefinitions: FunctionParameter[];
    shouldAddComma: boolean;
    hasMoreMandatoryArgs: boolean;
    preferredPlaceholderType?: SupportedDataType | 'unknown';
    includeValuesControl?: boolean;
    includeConstantFunctions?: boolean;
  }): this {
    const {
      paramDefinitions,
      shouldAddComma,
      hasMoreMandatoryArgs,
      preferredPlaceholderType,
      includeValuesControl,
      includeConstantFunctions = true,
    } = options;
    const constantOnlyParams = getConstantOnlyParams(paramDefinitions);

    if (!constantOnlyParams.length) {
      return this;
    }

    const types = pairKeywordAndTextTypes(constantOnlyParams.map(({ type }) => type));

    this.addLiterals({
      types,
      addComma: shouldAddComma,
      advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
      includeDateLiterals: false, // Date literals are added separately by the function-parameter flow
      includeCompatibleLiterals: true,
    });

    // Function parameters also accept zero-arg functions (e.g. NOW(), PI())
    if (includeConstantFunctions) {
      this.addFunctions({
        types,
        addComma: shouldAddComma,
        constantGeneratingOnly: true,
      });
    }

    // Add placeholder hint ONLY for explicit constant parameters (not duration-derived ones)
    const hasExplicitConstantOnly = paramDefinitions.some(isConstantParameter);

    if (hasExplicitConstantOnly) {
      const placeholderType = findConstantPlaceholderType(types, preferredPlaceholderType);

      if (placeholderType) {
        this.suggestions.push(buildAddValuePlaceholder(placeholderType));
      }

      if (includeValuesControl) {
        this.suggestions.push(
          ...getControlSuggestionIfSupported(
            Boolean(this.context.context?.supportsControls),
            ESQLVariableType.VALUES,
            ControlTriggerSource.SMART_SUGGESTION,
            this.context.context?.variables
          )
        );
      }
    }

    return this;
  }

  addOperators(options?: {
    leftParamType?: FunctionParameterType;
    allowed?: string[];
    ignored?: string[];
    returnTypes?: PreferredExpressionType[];
  }): this {
    const ignored = this.resolveIgnoredDefinitions(false);

    if (options?.ignored) {
      ignored.push(...options.ignored);
    }

    const operatorSuggestions = getOperatorSuggestions(
      {
        location: this.context.location,
        leftParamType: options?.leftParamType,
        allowed: options?.allowed,
        ignored,
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

  /**
   * Returns definitions to exclude from suggestions by merging three sources:
   * 1. Command-level ignored definitions (e.g., EVAL hides match_phrase)
   *    - Applies exceptions: if current parent function is in allowedInsideFunctions, the function is not ignored
   * 2. Full-text definitions inside function parameters
   *    - Full-text definitions cannot be nested in functions unless allowedInsideFunctions says otherwise
   * 3. Parent function names for recursion prevention (e.g., ABS inside ABS)
   *    - Only included when excludeParentFunctions=true
   */
  private resolveIgnoredDefinitions(excludeParentFunctions: boolean): string[] {
    const {
      getFunctionsToIgnore,
      parentFunctionNames = [],
      functionParameterContext,
    } = this.context.options;
    const ignored = getFunctionsToIgnore?.(functionParameterContext);
    const ignoredNames = new Set(ignored?.names ?? []);
    const parentFn = functionParameterContext?.functionDefinition?.name?.toLowerCase();

    if (functionParameterContext) {
      for (const definitionName of FULL_TEXT_SEARCH_DEFINITIONS) {
        ignoredNames.add(definitionName);
      }
    }

    if (parentFn) {
      for (const [definitionName, allowedParents] of Object.entries(
        ignored?.allowedInsideFunctions ?? {}
      )) {
        if (allowedParents.some((f) => f.toLowerCase() === parentFn)) {
          ignoredNames.delete(definitionName);
        }
      }
    }

    if (excludeParentFunctions) {
      for (const parentName of parentFunctionNames) {
        ignoredNames.add(parentName);
      }
    }

    return [...ignoredNames];
  }
}

function getFunctionsSuggestions({
  location,
  types,
  options = {},
  context,
  callbacks,
}: GetFunctionsSuggestionsParams): ISuggestionItem[] {
  const {
    ignored = [],
    addComma = false,
    suggestOnlyName = false,
    addSpaceAfterFunction = false,
    constantGeneratingOnly = false,
    functionTypes,
  } = options;

  const predicates = {
    location,
    returnTypes: types,
    ignored,
    isTimeseriesSource: context?.isTimeseriesSource,
  };

  const hasMinimumLicenseRequired = callbacks?.hasMinimumLicenseRequired;
  const activeProduct = context?.activeProduct;

  let filteredFunctions = filterFunctionDefinitions(
    getAllFunctions({ includeOperators: false, type: functionTypes }),
    predicates,
    hasMinimumLicenseRequired,
    activeProduct
  );

  if (constantGeneratingOnly) {
    const typeSet = new Set(types);
    filteredFunctions = filteredFunctions.filter((fn) =>
      fn.signatures.some((sig) => sig.params.length === 0 && typeSet.has(sig.returnType))
    );
  }

  const textSuffix = (addComma ? ',' : '') + (addSpaceAfterFunction ? ' ' : '');

  return filteredFunctions.map((fn) => {
    const suggestion = getFunctionSuggestion(fn);

    if (suggestOnlyName) {
      suggestion.text = fn.name.toUpperCase();
      return suggestion;
    }

    if (textSuffix) {
      suggestion.text += textSuffix;
    }

    return withAutoSuggest(suggestion);
  });
}

/** Filters parameters that only accept constant values (literals or duration types) */
function getConstantOnlyParams(paramDefinitions: FunctionParameter[]): FunctionParameter[] {
  return paramDefinitions.filter(
    (param) => isConstantParameter(param) || /_duration/.test(String(param.type))
  );
}

function getLiteralsSuggestions(
  types: (SupportedDataType | 'unknown' | 'any')[],
  location: Location,
  options: LiteralSuggestionsOptions = {}
): ISuggestionItem[] {
  const { includeDateLiterals = true, includeCompatibleLiterals = true } = options;

  const suggestions: ISuggestionItem[] = [];

  if (
    includeDateLiterals &&
    (location === Location.WHERE ||
      location === Location.EVAL ||
      location === Location.STATS_WHERE) &&
    types.includes('date')
  ) {
    suggestions.push(
      ...getDateLiterals({
        addComma: options.addComma,
        advanceCursorAndOpenSuggestions: options.advanceCursorAndOpenSuggestions,
      })
    );
  }

  if (includeCompatibleLiterals) {
    suggestions.push(
      ...getCompatibleLiterals(
        types,
        {
          addComma: options.addComma,
          advanceCursorAndOpenSuggestions: options.advanceCursorAndOpenSuggestions,
          supportsControls: options.supportsControls,
        },
        options.variables
      )
    );
  }

  return suggestions;
}
