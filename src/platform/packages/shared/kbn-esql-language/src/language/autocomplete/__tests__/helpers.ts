/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { camelCase } from 'lodash';
import type { LicenseType } from '@kbn/licensing-types';
import {
  type ESQLCallbacks,
  type ESQLFieldWithMetadata,
  type EsqlFieldType,
  esqlFieldTypes,
} from '@kbn/esql-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import {
  type FunctionParameterType,
  type FunctionReturnType,
  type FunctionDefinition,
  FunctionDefinitionTypes,
} from '../../../commands/definitions/types';
import { withAutoSuggest } from '../../../commands/definitions/utils/autocomplete/helpers';
import { getSafeInsertText } from '../../../commands/definitions/utils';
import type { Location, ISuggestionItem } from '../../../commands/registry/types';
import { aggFunctionDefinitions } from '../../../commands/definitions/generated/aggregation_functions';
import { timeSeriesAggFunctionDefinitions } from '../../../commands/definitions/generated/time_series_agg_functions';
import { groupingFunctionDefinitions } from '../../../commands/definitions/generated/grouping_functions';
import { scalarFunctionDefinitions } from '../../../commands/definitions/generated/scalar_functions';
import {
  operatorsDefinitions,
  logicalOperators,
  arithmeticOperators,
  comparisonFunctions,
  patternMatchOperators,
  inOperators,
  nullCheckOperators,
} from '../../../commands/definitions/all_operators';

import { getLocationFromCommandOrOptionName } from '../../../commands/registry/location';
import { NOT_SUGGESTED_TYPES } from '../../../query_columns_service';
import * as autocomplete from '../autocomplete';
import {
  joinIndices,
  timeseriesIndices,
  editorExtensions,
  inferenceEndpoints,
  views,
} from '../../../__tests__/language/helpers';
import { IGNORED_FUNCTIONS_BY_LOCATION } from '../../../__tests__/commands/autocomplete';

export type PartialSuggestionWithText = Partial<ISuggestionItem> & { text: string };

export const TIME_PICKER_SUGGESTION: PartialSuggestionWithText = {
  text: '',
  label: 'Choose from the time picker',
};

export type TestField = ESQLFieldWithMetadata & { suggestedAs?: string };

export const fields: TestField[] = [
  ...esqlFieldTypes.map((type) => ({
    name: `${camelCase(type)}Field`,
    type,
    userDefined: false as const,
    // suggestedAs is optional and omitted here
  })),
  {
    name: 'any#Char$Field',
    type: 'double',
    suggestedAs: '`any#Char$Field`',
    userDefined: false as const,
  },
  {
    name: 'kubernetes.something.something',
    type: 'double',
    suggestedAs: undefined,
    userDefined: false as const,
  },
];

export const lookupIndexFields: TestField[] = [
  { name: 'booleanField', type: 'boolean', userDefined: false },
  { name: 'dateField', type: 'date', userDefined: false },
  { name: 'joinIndexOnlyField', type: 'text', userDefined: false },
];

export const indexes = (
  [] as Array<{ name: string; hidden: boolean; suggestedAs?: string }>
).concat(
  [
    'a',
    'index',
    'otherIndex',
    '.secretIndex',
    'my-index',
    'my-index$',
    'my_index{}',
    'my-index+1',
    'synthetics-*',
  ].map((name) => ({
    name,
    hidden: name.startsWith('.'),
  })),
  ['my-index[quoted]', 'my:index', 'my,index', 'logstash-{now/d{yyyy.MM.dd|+12:00}}'].map(
    (name) => ({
      name,
      hidden: false,
      suggestedAs: `"${name}"`,
    })
  )
);

export const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: undefined,
  },
  ...['my-policy[quoted]', 'my-policy$', 'my_policy{}'].map((name) => ({
    name,
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: `\`${name}\``,
  })),
];

/**
 * Utility to filter down the function list for the given type
 * It is mainly driven by the return type, but it can be filtered upon with the last optional argument "paramsTypes"
 * just make sure to pass the arguments in the right order
 * @param command current command context
 * @param expectedReturnType the expected type returned by the function
 * @param functionCategories
 * @param paramsTypes the function argument types (optional)
 * @returns
 */
export function getFunctionSignaturesByReturnType(
  location: Location | Location[],
  _expectedReturnType: Readonly<FunctionReturnType | 'any' | Array<FunctionReturnType | 'any'>>,
  {
    agg,
    grouping,
    scalar,
    operators,
    excludeOperatorGroups,
    timeseriesAgg,
    // skipAssign here is used to communicate to not propose an assignment if it's not possible
    // within the current context (the actual logic has it, but here we want a shortcut)
    skipAssign,
  }: {
    agg?: boolean;
    grouping?: boolean;
    scalar?: boolean;
    operators?: boolean;
    /** Exclude specific operator groups (e.g., ['in', 'nullCheck']) */
    excludeOperatorGroups?: Array<
      'logical' | 'comparison' | 'arithmetic' | 'pattern' | 'in' | 'nullCheck'
    >;
    timeseriesAgg?: boolean;
    skipAssign?: boolean;
  } = {},
  paramsTypes?: Readonly<FunctionParameterType[]>,
  ignored?: string[],
  option?: string,
  hasMinimumLicenseRequired = (license?: LicenseType | undefined): boolean =>
    license === 'platinum',
  activeProduct?: PricingProduct
): PartialSuggestionWithText[] {
  const expectedReturnType = Array.isArray(_expectedReturnType)
    ? _expectedReturnType
    : [_expectedReturnType];

  const list = [];
  if (agg) {
    list.push(...aggFunctionDefinitions);
  }
  if (grouping) {
    list.push(...groupingFunctionDefinitions);
  }
  // eval functions (eval is a special keyword in JS)
  if (scalar) {
    list.push(...scalarFunctionDefinitions);
  }
  if (timeseriesAgg) {
    list.push(...timeSeriesAggFunctionDefinitions);
  }
  if (operators) {
    // Build set of operator names to exclude based on excludeOperatorGroups
    const excludedOperatorNames = new Set<string>();

    if (excludeOperatorGroups) {
      const operatorGroupMap: Record<string, FunctionDefinition[]> = {
        logical: logicalOperators,
        comparison: comparisonFunctions,
        arithmetic: arithmeticOperators,
        pattern: patternMatchOperators,
        in: inOperators,
        nullCheck: nullCheckOperators,
      };

      for (const groupName of excludeOperatorGroups) {
        const group = operatorGroupMap[groupName];

        if (group) {
          for (const op of group) {
            excludedOperatorNames.add(op.name);
          }
        }
      }
    }

    list.push(
      ...operatorsDefinitions.filter(({ name }) => {
        if (skipAssign && (name === '=' || name === ':')) {
          return false;
        }

        if (excludedOperatorNames.has(name)) {
          return false;
        }

        return true;
      })
    );
  }

  const deduped = Array.from(new Set(list));

  const locations = Array.isArray(location) ? location : [location];

  return deduped
    .filter(
      ({ signatures, ignoreAsSuggestion, locationsAvailable, observabilityTier, license }) => {
        const hasRestrictedSignature = signatures.some((signature) => signature.license);
        if (hasRestrictedSignature) {
          const availableSignatures = signatures.filter((signature) => {
            if (!signature.license) return true;
            return hasMinimumLicenseRequired(signature.license.toLocaleLowerCase() as LicenseType);
          });

          if (availableSignatures.length === 0) {
            return false;
          }
        }

        const hasObservabilityAccess = !(
          observabilityTier &&
          activeProduct &&
          activeProduct.type === 'observability' &&
          activeProduct.tier !== observabilityTier.toLowerCase()
        );

        if (!hasObservabilityAccess) {
          return false;
        }

        if (ignoreAsSuggestion) {
          return false;
        }
        if (
          !(option ? [...locations, getLocationFromCommandOrOptionName(option)] : locations).some(
            (loc) => locationsAvailable.includes(loc)
          )
        ) {
          return false;
        }
        const filteredByReturnType = signatures.filter(
          ({ returnType }) =>
            expectedReturnType.includes('any') || expectedReturnType.includes(returnType as string)
        );
        if (!filteredByReturnType.length && !expectedReturnType.includes('any')) {
          return false;
        }
        if (paramsTypes?.length) {
          return filteredByReturnType.some(
            ({ params }) =>
              !params.length ||
              (paramsTypes.length <= params.length &&
                paramsTypes.every(
                  (expectedType, i) =>
                    expectedType === 'any' ||
                    params[i].type === 'any' ||
                    expectedType === params[i].type
                ))
          );
        }
        return true;
      }
    )
    .filter(({ name }) => {
      const locationIgnored = locations.flatMap((loc) => IGNORED_FUNCTIONS_BY_LOCATION[loc] ?? []);
      const allIgnored = [...locationIgnored, ...(ignored ?? [])];

      if (allIgnored.length) {
        return !allIgnored.includes(name);
      }

      return true;
    })
    .sort(({ name: a }, { name: b }) => a.localeCompare(b))
    .map<PartialSuggestionWithText>((definition) => {
      const { type, name, signatures, customParametersSnippet } = definition;

      if (type === FunctionDefinitionTypes.OPERATOR) {
        return {
          text: signatures.some(({ params }) => params.length > 1)
            ? `${name.toUpperCase()} $0`
            : name.toUpperCase(),
          label: name.toUpperCase(),
        };
      }

      const hasNoArguments = signatures.every((sig) => sig.params.length === 0);
      if (hasNoArguments) {
        return {
          text: `${name.toUpperCase()}()`,
          label: name.toUpperCase(),
        };
      }

      return {
        text: customParametersSnippet
          ? `${name.toUpperCase()}(${customParametersSnippet})`
          : `${name.toUpperCase()}($0)`,
        label: name.toUpperCase(),
      };
    });
}

export function getFieldNamesByType(
  _requestedType: Readonly<EsqlFieldType | 'any' | Array<EsqlFieldType | 'any'>>
) {
  const requestedType = Array.isArray(_requestedType) ? _requestedType : [_requestedType];
  return fields
    .filter(
      ({ type }) =>
        (requestedType.includes('any') || requestedType.includes(type)) &&
        !NOT_SUGGESTED_TYPES.includes(type)
    )
    .map(({ name, suggestedAs }) => suggestedAs || name);
}

export function createCustomCallbackMocks(
  /**
   * Columns that will come from Elasticsearch since the last command
   * e.g. the test case may be `FROM index | EVAL foo = 1 | KEEP /`
   *
   * In this case, the columns available for the KEEP command will be the ones
   * that were available after the EVAL command
   *
   * `FROM index | EVAL foo = 1 | LIMIT 0` will be used to fetch columns. The response
   * will include "foo" as a column.
   */
  customColumnsSinceLastCommand?: ESQLFieldWithMetadata[],
  customSources?: Array<{ name: string; hidden: boolean }>,
  customPolicies?: Array<{
    name: string;
    sourceIndices: string[];
    matchField: string;
    enrichFields: string[];
  }>,
  customLicenseType = 'platinum',
  customActiveProduct?: PricingProduct
): ESQLCallbacks {
  const finalColumnsSinceLastCommand =
    customColumnsSinceLastCommand ||
    fields.filter(({ type }) => !NOT_SUGGESTED_TYPES.includes(type));
  const finalSources = customSources || indexes;
  const finalPolicies = customPolicies || policies;

  return {
    getColumnsFor: jest.fn(async (params) => {
      if (params?.query === 'FROM join_index') {
        return lookupIndexFields;
      }

      return finalColumnsSinceLastCommand;
    }),
    getSources: jest.fn(async () => finalSources),
    getPolicies: jest.fn(async () => finalPolicies),
    getJoinIndices: jest.fn(async () => ({ indices: joinIndices })),
    getTimeseriesIndices: jest.fn(async () => ({ indices: timeseriesIndices })),
    getViews: jest.fn(async () => ({ views })),
    getEditorExtensions: jest.fn(async (queryString: string) => {
      // from * is called in the empty state
      if (queryString.includes('logs*') || queryString === 'from *') {
        return {
          recommendedQueries: editorExtensions.recommendedQueries,
          recommendedFields: editorExtensions.recommendedFields,
        };
      }
      return { recommendedQueries: [], recommendedFields: [] };
    }),
    getInferenceEndpoints: jest.fn(async () => ({ inferenceEndpoints })),
    getLicense: jest.fn(async () => ({
      hasAtLeast: (requiredLevel: string) => customLicenseType === requiredLevel,
    })),
    getActiveProduct: jest.fn(() => customActiveProduct),
  };
}

export function getPolicyFields(policyName: string) {
  return policies
    .filter(({ name }) => name === policyName)
    .flatMap(({ enrichFields }) => enrichFields.map((field) => getSafeInsertText(field)));
}

export interface SuggestOptions {
  triggerCharacter?: string;
  callbacks?: ESQLCallbacks;
}

export type AssertSuggestionsFn = (
  query: string,
  expected: Array<string | PartialSuggestionWithText>,
  opts?: SuggestOptions
) => Promise<void>;

export type SuggestFn = (query: string, opts?: SuggestOptions) => Promise<ISuggestionItem[]>;

export const setup = async (caret = '/') => {
  if (caret.length !== 1) {
    throw new Error('Caret must be a single character');
  }

  const callbacks = createCustomCallbackMocks();

  const suggest: SuggestFn = async (query, opts = {}) => {
    const pos = query.indexOf(caret);
    if (pos < 0) throw new Error(`User cursor/caret "${caret}" not found in query: ${query}`);
    const querySansCaret = query.slice(0, pos) + query.slice(pos + 1);
    return await autocomplete.suggest(querySansCaret, pos, opts.callbacks ?? callbacks);
  };

  const assertSuggestions: AssertSuggestionsFn = async (query, expected, opts) => {
    try {
      const result = await suggest(query, opts);
      const resultTexts = [...result.map((suggestion) => suggestion.text)].sort();

      const expectedTexts = expected
        .map((suggestion) => (typeof suggestion === 'string' ? suggestion : suggestion.text ?? ''))
        .sort();

      expect(resultTexts).toEqual(expectedTexts);

      const expectedNonStringSuggestions = expected.filter(
        (suggestion) => typeof suggestion !== 'string'
      ) as PartialSuggestionWithText[];

      for (const expectedSuggestion of expectedNonStringSuggestions) {
        const suggestion = result.find((s) => s.text === expectedSuggestion.text);
        expect(suggestion).toEqual(expect.objectContaining(expectedSuggestion));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed query\n-------------\n${query}`);
      throw error;
    }
  };

  return {
    callbacks,
    suggest,
    assertSuggestions,
  };
};

/**
 * Attaches the trigger command to an expected suggestion to make
 * sure the suggestions menu will be opened when the suggestion is accepted.
 */
export const attachTriggerCommand = (
  s: string | PartialSuggestionWithText
): PartialSuggestionWithText =>
  typeof s === 'string'
    ? withAutoSuggest({
        text: s,
      } as ISuggestionItem)
    : withAutoSuggest(s as ISuggestionItem);

export const attachParameterHelperCommand = (
  s: string | PartialSuggestionWithText
): PartialSuggestionWithText => {
  const command = {
    id: 'editor.action.triggerParameterHints',
    title: '',
  };
  return typeof s === 'string'
    ? {
        text: s,
        command,
      }
    : {
        ...s,
        command,
      };
};
