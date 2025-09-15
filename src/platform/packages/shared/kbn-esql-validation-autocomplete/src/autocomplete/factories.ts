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
import { ESQLVariableType, type ESQLControlVariable, type RecommendedField } from '@kbn/esql-types';
import { SuggestionRawDefinition } from './types';
import { groupingFunctionDefinitions } from '../definitions/generated/grouping_functions';
import { aggFunctionDefinitions } from '../definitions/generated/aggregation_functions';
import { scalarFunctionDefinitions } from '../definitions/generated/scalar_functions';
import { getFunctionSignatures } from '../definitions/helpers';
import { timeUnitsToSuggest } from '../definitions/literals';
import {
  FunctionDefinition,
  FunctionParameterType,
  FunctionDefinitionTypes,
  Location,
} from '../definitions/types';
import { shouldBeQuotedSource, shouldBeQuotedText } from '../shared/helpers';
import { buildFunctionDocumentation } from './documentation_util';
import { DOUBLE_BACKTICK, SINGLE_TICK_REGEX } from '../shared/constants';
import { ESQLFieldWithMetadata } from '../validation/types';
import { getTestFunctions } from '../shared/test_functions';
import { operatorsDefinitions } from '../definitions/all_operators';

const techPreviewLabel = i18n.translate(
  'kbn-esql-validation-autocomplete.esql.autocomplete.techPreviewLabel',
  {
    defaultMessage: `Technical Preview`,
  }
);

const getVariablePrefix = (variableType: ESQLVariableType) =>
  variableType === ESQLVariableType.FIELDS || variableType === ESQLVariableType.FUNCTIONS
    ? '??'
    : '?';

const allFunctions = memoize(
  () =>
    aggFunctionDefinitions
      .concat(scalarFunctionDefinitions)
      .concat(groupingFunctionDefinitions)
      .concat(getTestFunctions()),
  () => getTestFunctions()
);

export const TIME_SYSTEM_PARAMS = ['?_tstart', '?_tend'];

export const TRIGGER_SUGGESTION_COMMAND = {
  title: 'Trigger Suggestion Dialog',
  id: 'editor.action.triggerSuggest',
};

export function getSafeInsertText(text: string, options: { dashSupported?: boolean } = {}) {
  return shouldBeQuotedText(text, options)
    ? `\`${text.replace(SINGLE_TICK_REGEX, DOUBLE_BACKTICK)}\``
    : text;
}
export function getQuotedText(text: string) {
  return text.startsWith(`"`) && text.endsWith(`"`) ? text : `"${text}"`;
}

function getSafeInsertSourceText(text: string) {
  return shouldBeQuotedSource(text) ? getQuotedText(text) : text;
}

export function getFunctionSuggestion(fn: FunctionDefinition): SuggestionRawDefinition {
  let detail = fn.description;
  if (fn.preview) {
    detail = `[${techPreviewLabel}] ${detail}`;
  }
  const fullSignatures = getFunctionSignatures(fn, { capitalize: true, withTypes: true });

  let text = `${fn.name.toUpperCase()}($0)`;
  if (fn.customParametersSnippet) {
    text = `${fn.name.toUpperCase()}(${fn.customParametersSnippet})`;
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
    // agg functgions have priority over everything else
    sortText: fn.type === FunctionDefinitionTypes.AGG ? '1A' : 'C',
    // trigger a suggestion follow up on selection
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

export function getOperatorSuggestion(fn: FunctionDefinition): SuggestionRawDefinition {
  const hasArgs = fn.signatures.some(({ params }) => params.length > 1);
  return {
    label: fn.name.toUpperCase(),
    text: hasArgs ? `${fn.name.toUpperCase()} $0` : fn.name.toUpperCase(),
    asSnippet: hasArgs,
    kind: 'Operator',
    detail: fn.description,
    documentation: {
      value: '',
    },
    sortText: 'D',
    command: hasArgs ? TRIGGER_SUGGESTION_COMMAND : undefined,
  };
}

interface FunctionFilterPredicates {
  location: Location;
  returnTypes?: string[];
  ignored?: string[];
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

/**
 * Builds suggestions for functions based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for a function to be included in the suggestions
 * @returns
 */
export const getFunctionSuggestions = (
  predicates?: FunctionFilterPredicates
): SuggestionRawDefinition[] => {
  return filterFunctionDefinitions(allFunctions(), predicates).map(getFunctionSuggestion);
};

/**
 * Builds suggestions for operators based on the provided predicates.
 *
 * @param predicates a set of conditions that must be met for an operator to be included in the suggestions
 * @returns
 */
export const getOperatorSuggestions = (
  predicates?: FunctionFilterPredicates & { leftParamType?: FunctionParameterType }
): SuggestionRawDefinition[] => {
  const filteredDefinitions = filterFunctionDefinitions(
    getTestFunctions().length
      ? [...operatorsDefinitions, ...getTestFunctions()]
      : operatorsDefinitions,
    predicates
  );

  // make sure the operator has at least one signature that matches
  // the type of the existing left argument if provided (e.g. "doubleField <suggest>")
  return (
    predicates?.leftParamType
      ? filteredDefinitions.filter(({ signatures }) =>
          signatures.some(
            ({ params }) =>
              !params.length ||
              params.some((pArg) => pArg.type === predicates?.leftParamType || pArg.type === 'any')
          )
        )
      : filteredDefinitions
  ).map(getOperatorSuggestion);
};

export const getSuggestionsAfterNot = (): SuggestionRawDefinition[] => {
  return operatorsDefinitions
    .filter(({ name }) => name === 'like' || name === 'rlike' || name === 'in')
    .map(getOperatorSuggestion);
};

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
  getVariables?: () => ESQLControlVariable[] | undefined
): SuggestionRawDefinition[] => {
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
  }) as SuggestionRawDefinition[];

  const suggestions = [...fieldsSuggestions];
  if (options?.supportsControls) {
    const variableType = options?.variableType ?? ESQLVariableType.FIELDS;
    const userDefinedColumns =
      getVariables?.()?.filter((variable) => variable.type === variableType) ?? [];

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

export const buildFieldsDefinitions = (
  fields: string[],
  openSuggestions = true
): SuggestionRawDefinition[] => {
  return fields.map((label) => ({
    label,
    text: getSafeInsertText(label),
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.fieldDefinition', {
      defaultMessage: `Field specified by the input table`,
    }),
    sortText: 'D',
    command: openSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  }));
};
export const buildUserDefinedColumnsDefinitions = (
  userDefinedColumns: string[]
): SuggestionRawDefinition[] =>
  userDefinedColumns.map((label) => ({
    label,
    text: getSafeInsertText(label),
    kind: 'Variable',
    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.variableDefinition',
      {
        defaultMessage: `Column specified by the user within the ES|QL query`,
      }
    ),
    sortText: 'D',
  }));

export const buildSourcesDefinitions = (
  sources: Array<{ name: string; isIntegration: boolean; title?: string; type?: string }>
): SuggestionRawDefinition[] =>
  sources.map(({ name, isIntegration, title, type }) => ({
    label: title ?? name,
    text: getSafeInsertSourceText(name),
    isSnippet: isIntegration,
    kind: isIntegration ? 'Class' : 'Issue',
    detail: isIntegration
      ? i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.integrationDefinition', {
          defaultMessage: `Integration`,
        })
      : i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.sourceDefinition', {
          defaultMessage: '{type}',
          values: {
            type: type ?? 'Index',
          },
        }),
    sortText: 'A',
    command: TRIGGER_SUGGESTION_COMMAND,
  }));

export const buildConstantsDefinitions = (
  userConstants: string[],
  detail?: string,
  sortText?: string,
  /**
   * Whether or not to advance the cursor and open the suggestions dialog after inserting the constant.
   */
  options?: { advanceCursorAndOpenSuggestions?: boolean; addComma?: boolean }
): SuggestionRawDefinition[] =>
  userConstants.map((label) => ({
    label,
    text:
      label +
      (options?.addComma ? ',' : '') +
      (options?.advanceCursorAndOpenSuggestions ? ' ' : ''),
    kind: 'Constant',
    detail:
      detail ??
      i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.constantDefinition', {
        defaultMessage: `Constant`,
      }),
    sortText: sortText ?? 'A',
    command: options?.advanceCursorAndOpenSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  }));

export const buildValueDefinitions = (
  values: string[],
  options?: { advanceCursorAndOpenSuggestions?: boolean; addComma?: boolean }
): SuggestionRawDefinition[] =>
  values.map((value) => ({
    label: `"${value}"`,
    text: `"${value}"${options?.addComma ? ',' : ''}${
      options?.advanceCursorAndOpenSuggestions ? ' ' : ''
    }`,
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.valueDefinition', {
      defaultMessage: 'Literal value',
    }),
    kind: 'Value',
    command: options?.advanceCursorAndOpenSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  }));

export const getNewUserDefinedColumnSuggestion = (label: string): SuggestionRawDefinition => {
  return {
    label,
    text: `${label} = `,
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.newVarDoc', {
      defaultMessage: 'Define a new column',
    }),
    sortText: '1',
    command: TRIGGER_SUGGESTION_COMMAND,
  };
};

export const buildPoliciesDefinitions = (
  policies: Array<{ name: string; sourceIndices: string[] }>
): SuggestionRawDefinition[] =>
  policies.map(({ name: label, sourceIndices }) => ({
    label,
    text: getSafeInsertText(label, { dashSupported: true }) + ' ',
    kind: 'Class',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.policyDefinition', {
      defaultMessage: `Policy defined on {count, plural, one {index} other {indices}}: {indices}`,
      values: {
        count: sourceIndices.length,
        indices: sourceIndices.join(', '),
      },
    }),
    sortText: 'D',
    command: TRIGGER_SUGGESTION_COMMAND,
  }));

export function getUnitDuration(unit: number = 1) {
  const filteredTimeLiteral = timeUnitsToSuggest.filter(({ name }) => {
    const result = /s$/.test(name);
    return unit > 1 ? result : !result;
  });
  return filteredTimeLiteral.map(({ name }) => `${unit} ${name}`);
}

/**
 * Given information about the current command and the parameter type, suggest
 * some literals that may make sense.
 *
 * TODO — this currently tries to cover both command-specific suggestions and type
 * suggestions. We could consider separating the two... or just using parameter types
 * and forgetting about command-specific suggestions altogether.
 *
 * Another thought... should literal suggestions be defined in the definitions file?
 * That approach might allow for greater specificity in the suggestions and remove some
 * "magical" logic. Maybe this is really the same thing as the literalOptions parameter
 * definition property...
 */
export function getCompatibleLiterals(
  types: string[],
  options?: {
    advanceCursorAndOpenSuggestions?: boolean;
    addComma?: boolean;
    supportsControls?: boolean;
  },
  getVariables?: () => ESQLControlVariable[] | undefined
) {
  const suggestions: SuggestionRawDefinition[] = [];
  if (types.includes('time_duration')) {
    const timeLiteralSuggestions = [
      ...buildConstantsDefinitions(getUnitDuration(1), undefined, undefined, options),
    ];
    if (options?.supportsControls) {
      const userDefinedColumns =
        getVariables?.()?.filter((variable) => variable.type === ESQLVariableType.TIME_LITERAL) ??
        [];
      timeLiteralSuggestions.push(
        ...getControlSuggestion(
          ESQLVariableType.TIME_LITERAL,
          userDefinedColumns.map((v) => `?${v.key}`)
        )
      );
    }
    // filter plural for now and suggest only unit + singular
    suggestions.push(...timeLiteralSuggestions); // i.e. 1 year
  }
  // this is a special type built from the suggestion system, not inherited from the AST
  if (types.includes('time_literal_unit')) {
    suggestions.push(
      ...buildConstantsDefinitions(
        timeUnitsToSuggest.map(({ name }) => name),
        undefined,
        undefined,
        options
      )
    ); // i.e. year, month, ...
  }
  return suggestions;
}

export const TIME_SYSTEM_DESCRIPTIONS = {
  '?_tstart': i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.timeSystemParamStart',
    {
      defaultMessage: 'The start time from the date picker',
    }
  ),
  '?_tend': i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.timeSystemParamEnd',
    {
      defaultMessage: 'The end time from the date picker',
    }
  ),
};
export function getDateLiterals(options?: {
  advanceCursorAndOpenSuggestions?: boolean;
  addComma?: boolean;
}) {
  return [
    ...buildConstantsDefinitions(
      TIME_SYSTEM_PARAMS,
      i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.namedParamDefinition', {
        defaultMessage: 'Named parameter',
      }),
      '1A',
      options
    ),
    {
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.chooseFromTimePickerLabel',
        {
          defaultMessage: 'Choose from the time picker',
        }
      ),
      text: '',
      kind: 'Issue',
      detail: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.chooseFromTimePicker',
        {
          defaultMessage: 'Click to choose',
        }
      ),
      sortText: '1A',
      command: {
        id: 'esql.timepicker.choose',
        title: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.chooseFromTimePicker',
          {
            defaultMessage: 'Click to choose',
          }
        ),
      },
    } as SuggestionRawDefinition,
  ];
}

export function getControlSuggestionIfSupported(
  supportsControls: boolean,
  type: ESQLVariableType,
  getVariables?: () => ESQLControlVariable[] | undefined,
  shouldBePrefixed = true
) {
  if (!supportsControls) {
    return [];
  }
  const prefix = shouldBePrefixed ? getVariablePrefix(type) : '';
  const variables = getVariables?.()?.filter((variable) => variable.type === type) ?? [];
  const controlSuggestion = getControlSuggestion(
    type,
    variables?.map((v) => `${prefix}${v.key}`)
  );
  return controlSuggestion;
}

export function getControlSuggestion(
  type: ESQLVariableType,
  variables?: string[]
): SuggestionRawDefinition[] {
  return [
    {
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.createControlLabel',
        {
          defaultMessage: 'Create control',
        }
      ),
      text: '',
      kind: 'Issue',
      detail: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.createControlDetailLabel',
        {
          defaultMessage: 'Click to create',
        }
      ),
      sortText: '1',
      command: {
        id: `esql.control.${type}.create`,
        title: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.createControlDetailLabel',
          {
            defaultMessage: 'Click to create',
          }
        ),
      },
    } as SuggestionRawDefinition,
    ...(variables?.length
      ? buildConstantsDefinitions(
          variables,
          i18n.translate(
            'kbn-esql-validation-autocomplete.esql.autocomplete.namedParamDefinition',
            {
              defaultMessage: 'Named parameter',
            }
          ),
          '1A'
        )
      : []),
  ];
}
