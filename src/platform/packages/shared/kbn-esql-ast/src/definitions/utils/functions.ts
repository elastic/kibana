/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import { ESQLControlVariable, ESQLVariableType, RecommendedField } from '@kbn/esql-types';
import {
  type FunctionDefinition,
  type FunctionFilterPredicates,
  type FunctionParameterType,
  FunctionDefinitionTypes,
  type SupportedDataType,
  type FunctionReturnType,
} from '../types';
import { operatorsDefinitions } from '../all_operators';
import { aggFunctionDefinitions } from '../generated/aggregation_functions';
import { timeSeriesAggFunctionDefinitions } from '../generated/time_series_agg_functions';
import { groupingFunctionDefinitions } from '../generated/grouping_functions';
import { scalarFunctionDefinitions } from '../generated/scalar_functions';
import { ESQLFieldWithMetadata, ISuggestionItem } from '../../commands_registry/types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../commands_registry/constants';
import { buildFunctionDocumentation } from './documentation';
import { getSafeInsertText, getControlSuggestion } from './autocomplete/helpers';
import { ESQLAstItem, ESQLFunction } from '../../types';
import { removeFinalUnknownIdentiferArg, isParamExpressionType } from './shared';
import { getTestFunctions } from './test_functions';

const techPreviewLabel = i18n.translate('kbn-esql-ast.esql.autocomplete.techPreviewLabel', {
  defaultMessage: `Technical Preview`,
});

let fnLookups: Map<string, FunctionDefinition> | undefined;

export function buildFunctionLookup() {
  // we always refresh if we have test functions
  if (!fnLookups || getTestFunctions().length) {
    fnLookups = operatorsDefinitions
      .concat(
        scalarFunctionDefinitions,
        aggFunctionDefinitions,
        groupingFunctionDefinitions,
        timeSeriesAggFunctionDefinitions,
        getTestFunctions()
      )
      .reduce((memo, def) => {
        memo.set(def.name, def);
        if (def.alias) {
          for (const alias of def.alias) {
            memo.set(alias, def);
          }
        }
        return memo;
      }, new Map<string, FunctionDefinition>());
  }
  return fnLookups;
}

export const buildFieldsDefinitions = (
  fields: string[],
  openSuggestions = true
): ISuggestionItem[] => {
  return fields.map((label) => ({
    label,
    text: getSafeInsertText(label),
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-ast.esql.autocomplete.fieldDefinition', {
      defaultMessage: `Field specified by the input table`,
    }),
    sortText: 'D',
    command: openSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  }));
};

export function getFunctionDefinition(name: string) {
  return buildFunctionLookup().get(name.toLowerCase());
}

export const filterFunctionDefinitions = (
  functions: FunctionDefinition[],
  predicates: FunctionFilterPredicates | undefined
): FunctionDefinition[] => {
  if (!predicates) {
    return functions;
  }
  const { location, returnTypes, ignored = [] } = predicates;

  return functions.filter(({ name, locationsAvailable, ignoreAsSuggestion, signatures }) => {
    if (ignoreAsSuggestion) {
      return false;
    }

    if (ignored.includes(name)) {
      return false;
    }

    if (location && !locationsAvailable.includes(location)) {
      return false;
    }

    if (returnTypes && !returnTypes.includes('any')) {
      return signatures.some((signature) => returnTypes.includes(signature.returnType as string));
    }

    return true;
  });
};

export function getAllFunctions(options?: {
  type: Array<FunctionDefinition['type']> | FunctionDefinition['type'];
}) {
  const fns = buildFunctionLookup();
  if (!options?.type) {
    return Array.from(fns.values());
  }
  const types = new Set(Array.isArray(options.type) ? options.type : [options.type]);
  return Array.from(fns.values()).filter((fn) => types.has(fn.type));
}

export function printArguments(
  {
    name,
    type,
    optional,
  }: {
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
  },
  withTypes: boolean
): string {
  if (!withTypes) {
    return name;
  }
  return `${name}${optional ? ':?' : ':'} ${Array.isArray(type) ? type.join(' | ') : type}`;
}

function handleAdditionalArgs(
  criteria: boolean,
  additionalArgs: Array<{
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
    reference?: string;
  }>,
  withTypes: boolean
) {
  return criteria
    ? `${withTypes ? ' ,[... ' : ', '}${additionalArgs
        .map((arg) => printArguments(arg, withTypes))
        .join(', ')}${withTypes ? ']' : ''}`
    : '';
}

/**
 * Given a function definition, this function will return a list of function signatures
 *
 * If withTypes is true, the function will return a formal function definition with all arguments typed.
 * This is used when generating the function signature for the monaco editor. If withTypes is false, you get
 * an "injectable" version of the signature to be used to generate test cases.
 */
export function getFunctionSignatures(
  { name, signatures }: FunctionDefinition,
  { withTypes, capitalize }: { withTypes: boolean; capitalize?: boolean } = {
    withTypes: true,
    capitalize: false,
  }
) {
  return signatures.map(({ params, returnType, minParams }) => {
    // for functions with a minimum number of args, repeat the last arg multiple times
    // just make sure to compute the right number of args to add
    const minParamsToAdd = Math.max((minParams || 0) - params.length, 0);
    const extraArg = Array(minParamsToAdd || 1).fill(params[Math.max(params.length - 1, 0)]);
    return {
      declaration: `${capitalize ? name.toUpperCase() : name}(${params
        .map((arg) => printArguments(arg, withTypes))
        .join(', ')}${handleAdditionalArgs(minParamsToAdd > 0, extraArg, withTypes)})${
        withTypes ? `: ${returnType}` : ''
      }`,
    };
  });
}

const allFunctions = memoize(
  () =>
    aggFunctionDefinitions
      .concat(scalarFunctionDefinitions)
      .concat(groupingFunctionDefinitions)
      .concat(getTestFunctions())
      .concat(timeSeriesAggFunctionDefinitions),
  () => getTestFunctions()
);

export function getFunctionSuggestion(fn: FunctionDefinition): ISuggestionItem {
  let detail = fn.description;
  if (fn.preview) {
    detail = `[${techPreviewLabel}] ${detail}`;
  }
  const fullSignatures = getFunctionSignatures(fn, { capitalize: true, withTypes: true });

  let text = `${fn.name.toUpperCase()}($0)`;
  if (fn.customParametersSnippet) {
    text = `${fn.name.toUpperCase()}(${fn.customParametersSnippet})`;
  }
  let functionsPriority = fn.type === FunctionDefinitionTypes.AGG ? 'A' : 'C';
  if (fn.type === FunctionDefinitionTypes.TIME_SERIES_AGG) {
    functionsPriority = '1A';
  }
  return {
    label: fn.name.toUpperCase(),
    text,
    asSnippet: true,
    kind: 'Function',
    detail,
    documentation: {
      value: buildFunctionDocumentation(fullSignatures, fn.examples),
    },
    // time_series_agg functions have priority over everything else
    sortText: functionsPriority,
    // trigger a suggestion follow up on selection
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

/**
 * Builds suggestions for functions based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for a function to be included in the suggestions
 * @returns
 */
export const getFunctionSuggestions = (
  predicates?: FunctionFilterPredicates
): ISuggestionItem[] => {
  return filterFunctionDefinitions(allFunctions(), predicates).map(getFunctionSuggestion);
};

export function checkFunctionInvocationComplete(
  func: ESQLFunction,
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
): {
  complete: boolean;
  reason?: 'tooFewArgs' | 'wrongTypes';
} {
  const fnDefinition = getFunctionDefinition(func.name);
  if (!fnDefinition) {
    return { complete: false };
  }

  const cleanedArgs = removeFinalUnknownIdentiferArg(func.args, getExpressionType);

  const argLengthCheck = fnDefinition.signatures.some((def) => {
    if (def.minParams && cleanedArgs.length >= def.minParams) {
      return true;
    }
    if (cleanedArgs.length === def.params.length) {
      return true;
    }
    return cleanedArgs.length >= def.params.filter(({ optional }) => !optional).length;
  });
  if (!argLengthCheck) {
    return { complete: false, reason: 'tooFewArgs' };
  }
  if (
    (fnDefinition.name === 'in' || fnDefinition.name === 'not in') &&
    Array.isArray(func.args[1]) &&
    !func.args[1].length
  ) {
    return { complete: false, reason: 'tooFewArgs' };
  }

  // If the function is complete, check that the types of the arguments match the function definition
  const hasCorrectTypes = fnDefinition.signatures.some((def) => {
    return func.args.every((a, index) => {
      return (
        fnDefinition.name.endsWith('null') ||
        def.params[index].type === 'any' ||
        def.params[index].type === getExpressionType(a) ||
        // this is a special case for expressions with named parameters
        // e.g. "WHERE field == ?value"
        isParamExpressionType(getExpressionType(a))
      );
    });
  });
  if (!hasCorrectTypes) {
    return { complete: false, reason: 'wrongTypes' };
  }
  return { complete: true };
}

/**
 * Generates a sort key for field suggestions based on their categorization.
 * Recommended fields are prioritized, followed by ECS fields.
 *
 * @param isEcs - True if the field is an Elastic Common Schema (ECS) field.
 * @param isRecommended - True if the field is a recommended field from the registry.
 * @returns A string representing the sort key ('1C' for recommended, '1D' for ECS, 'D' for others).
 */
const getFieldsSortText = (isEcs: boolean, isRecommended: boolean) => {
  if (isRecommended) {
    return '1C';
  }
  if (isEcs) {
    return '1D';
  }
  return 'D';
};

const getVariablePrefix = (variableType: ESQLVariableType) =>
  variableType === ESQLVariableType.FIELDS || variableType === ESQLVariableType.FUNCTIONS
    ? '??'
    : '?';

export const buildFieldsDefinitionsWithMetadata = (
  fields: ESQLFieldWithMetadata[],
  recommendedFieldsFromExtensions: RecommendedField[] = [],
  options?: {
    advanceCursor?: boolean;
    openSuggestions?: boolean;
    addComma?: boolean;
    variableType?: ESQLVariableType;
    supportsControls?: boolean;
  },
  variables?: ESQLControlVariable[]
): ISuggestionItem[] => {
  const fieldsSuggestions = fields.map((field) => {
    const fieldType = field.type.charAt(0).toUpperCase() + field.type.slice(1);
    const titleCaseType = `${field.name} (${fieldType})`;
    // Check if the field is in the recommended fields from extensions list
    // and if so, mark it as recommended. This also ensures that recommended fields
    // that are registered wrongly, won't be shown as suggestions.
    const fieldIsRecommended = recommendedFieldsFromExtensions.some(
      (recommendedField) => recommendedField.name === field.name
    );
    const sortText = getFieldsSortText(Boolean(field.isEcs), Boolean(fieldIsRecommended));
    return {
      label: field.name,
      text:
        getSafeInsertText(field.name) +
        (options?.addComma ? ',' : '') +
        (options?.advanceCursor ? ' ' : ''),
      kind: 'Variable',
      detail: titleCaseType,
      sortText,
      command: options?.openSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
    };
  }) as ISuggestionItem[];

  const suggestions = [...fieldsSuggestions];
  if (options?.supportsControls) {
    const variableType = options?.variableType ?? ESQLVariableType.FIELDS;
    const userDefinedColumns =
      variables?.filter((variable) => variable.type === variableType) ?? [];

    const controlSuggestions = fields.length
      ? getControlSuggestion(
          variableType,
          userDefinedColumns?.map((v) => `${getVariablePrefix(variableType)}${v.key}`)
        )
      : [];
    suggestions.push(...controlSuggestions);
  }

  return [...suggestions];
};

export function printFunctionSignature(arg: ESQLFunction): string {
  const fnDef = getFunctionDefinition(arg.name);
  if (fnDef) {
    const signature = getFunctionSignatures(
      {
        ...fnDef,
        signatures: [
          {
            ...fnDef?.signatures[0],
            params: arg.args.map((innerArg) =>
              Array.isArray(innerArg)
                ? { name: `InnerArgument[]`, type: 'any' as const }
                : // this cast isn't actually correct, but we're abusing the
                  // getFunctionSignatures API anyways
                  { name: innerArg.text, type: innerArg.type as FunctionParameterType }
            ),
            // this cast isn't actually correct, but we're abusing the
            // getFunctionSignatures API anyways
            returnType: '' as FunctionReturnType,
          },
        ],
      },
      { withTypes: false, capitalize: true }
    );
    return signature[0].declaration;
  }
  return '';
}

export function getLookupIndexCreateSuggestion(indexName?: string): ISuggestionItem {
  return {
    label: indexName
      ? i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndexWithName',

          {
            defaultMessage: 'Create lookup index "{indexName}"',

            values: { indexName },
          }
        )
      : i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndex', {
          defaultMessage: 'Create lookup index',
        }),

    text: indexName,

    kind: 'Issue',

    filterText: indexName,

    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndexDetailLabel',

      {
        defaultMessage: 'Click to create',
      }
    ),

    sortText: '0-0',

    command: {
      id: `esql.lookup_index.create`,

      title: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndexDetailLabel',

        {
          defaultMessage: 'Click to create',
        }
      ),

      arguments: [indexName],
    },
  } as ISuggestionItem;
}
