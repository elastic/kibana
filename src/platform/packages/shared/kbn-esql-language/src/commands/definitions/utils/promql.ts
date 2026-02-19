/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ISuggestionItem } from '../../registry/types';
import type { ESQLAstPromqlCommand, ESQLMapEntry } from '../../../types';
import { EDITOR_MARKER } from '../constants';
import {
  ESQL_NUMBER_TYPES,
  ESQL_STRING_TYPES,
  PromQLFunctionDefinitionTypes,
  type PromQLFunctionDefinition,
  type PromQLFunctionParamType,
} from '../types';
import { promqlFunctionDefinitions } from '../generated/promql_functions';
import { promqlOperatorDefinitions } from '../generated/promql_operators';
import { promqlLabelMatcherDefinitions } from '../generated/promql_label_matchers';
import { buildFunctionDocumentation } from './documentation';
import { withAutoSuggest } from './autocomplete/helpers';
import { isIdentifier, isList, isSource } from '../../../ast/is';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting';
import { techPreviewLabel } from './shared';
import { arithmeticOperators } from '../all_operators';

const INDEX_PARAM_REGEX = /\bindex\s*=\s*(\S+)/i;

/* Builds readable signatures for PROMQL functions. */
const getPromqlFunctionDeclaration = (fn: PromQLFunctionDefinition) => {
  const { name, signatures } = fn;

  return signatures.map(({ params, returnType }) => ({
    declaration: `${name}(${params.map((param) => param.name).join(', ')})${
      returnType ? `: ${returnType}` : ''
    }`,
  }));
};

/* Converts a PROMQL function definition into an autocomplete suggestion. */
const getPromqlFunctionSuggestion = (fn: PromQLFunctionDefinition): ISuggestionItem => {
  const { description, examples, name, preview, signatures } = fn;
  const detail = description;
  const docDetail = preview ? `**[${techPreviewLabel}]** ${detail}` : detail;

  const hasNoArguments = signatures.every((signature) => signature.params.length === 0);
  const text = hasNoArguments ? `${name}() ` : `${name}($0) `;

  return {
    label: name,
    text,
    asSnippet: true,
    kind: 'Function',
    detail,
    category: SuggestionCategory.FUNCTION_AGG,
    documentation: {
      value: buildFunctionDocumentation(docDetail, getPromqlFunctionDeclaration(fn), examples),
    },
    command: {
      id: 'editor.action.triggerParameterHints',
      title: '',
    },
  };
};

/* Returns all PROMQL function suggestions suitable for autocomplete. */
const buildPromqlFunctionSuggestions = (): ISuggestionItem[] => {
  return promqlFunctionDefinitions
    .filter((fn) => !fn.ignoreAsSuggestion)
    .map((fn) => withAutoSuggest(getPromqlFunctionSuggestion(fn)));
};

export const getPromqlFunctionSuggestions = (
  returnTypes: PromQLFunctionParamType[] = []
): ISuggestionItem[] => {
  if (!returnTypes.length) {
    return buildPromqlFunctionSuggestions();
  }

  const allowed = new Set(returnTypes);

  return buildPromqlFunctionSuggestions().filter((suggestion) => {
    const definition = getPromqlFunctionDefinition(suggestion.label);
    if (!definition?.signatures.length) {
      return false;
    }

    return definition.signatures.some((signature) => allowed.has(signature.returnType));
  });
};

/* Returns the PromQL function definition matching the provided name. */
export const getPromqlFunctionDefinition = (
  name: string | undefined
): PromQLFunctionDefinition | undefined => {
  if (!name) {
    return undefined;
  }

  const normalized = name.toLowerCase();
  return promqlFunctionDefinitions.find((fn) => fn.name.toLowerCase() === normalized);
};

/* Returns the PromQL operator definition matching the provided operator symbol. */
export const getPromqlOperatorDefinition = (
  operator: string | undefined
): PromQLFunctionDefinition | undefined => {
  if (!operator) {
    return undefined;
  }

  const normalized = operator.toLowerCase();
  return promqlOperatorDefinitions.find(
    ({ operator: symbol, name, signatures }) =>
      (symbol ?? name)?.toLowerCase() === normalized &&
      signatures.some(({ params }) => params.length >= 2)
  );
};

/* Extracts param types for a specific PromQL function parameter index. */
export function getPromqlParamTypesForFunction(
  name: string | undefined,
  paramIndex: number
): PromQLFunctionParamType[] {
  const definition = getPromqlFunctionDefinition(name);
  if (!definition?.signatures.length) {
    return [];
  }

  return definition.signatures
    .map((signature) => signature.params[paramIndex]?.type)
    .filter((paramType) => !!paramType);
}

/* Reports whether a PromQL function is an across-series aggregation. */
export const isPromqlAcrossSeriesFunction = (name: string): boolean => {
  const normalized = name.toLowerCase();

  return promqlFunctionDefinitions.some(
    ({ name: fnName, type }) =>
      fnName.toLowerCase() === normalized && type === PromQLFunctionDefinitionTypes.ACROSS_SERIES
  );
};

/* Converts a PromQL symbol definition (operator or label matcher) into an autocomplete suggestion. */
const buildPromqlSymbolSuggestion = (definition: PromQLFunctionDefinition): ISuggestionItem => {
  const { description, examples, operator, name, preview } = definition;
  const detail = description;
  const docDetail = preview ? `**[${techPreviewLabel}]** ${detail}` : detail;
  const symbol = operator ?? name;

  return {
    label: symbol,
    text: `${symbol} `,
    asSnippet: false,
    kind: 'Operator',
    detail,
    documentation: {
      value: buildFunctionDocumentation(docDetail, [], examples),
    },
  };
};

// TODO: Temporarily limited to arithmetic operators. Remove filter when comparison and logical operators are fully supported.
export const getPromqlOperatorSuggestions = (): ISuggestionItem[] => {
  return promqlOperatorDefinitions
    .filter((op) => {
      const symbol = op.operator ?? op.name;

      return (
        !op.ignoreAsSuggestion &&
        op.signatures.some((sig) => sig.params.length >= 2) &&
        (arithmeticOperators.some(({ name }) => name === symbol) || symbol === '^')
      );
    })
    .map((op) => buildPromqlSymbolSuggestion(op));
};

/* Extracts rhs param types for a PromQL binary operator from operator signatures. */
export const getBinaryOperatorParamTypes = (
  operator: string,
  paramIndex: number
): PromQLFunctionParamType[] => {
  const definition = getPromqlOperatorDefinition(operator);

  if (!definition) {
    return [];
  }

  return definition.signatures
    .map((signature) => signature.params[paramIndex]?.type)
    .filter((paramType): paramType is PromQLFunctionParamType => Boolean(paramType));
};

/* Returns all PromQL label matcher suggestions suitable for autocomplete. */
export const getPromqlLabelMatcherSuggestions = (): ISuggestionItem[] => {
  return promqlLabelMatcherDefinitions
    .filter((op) => !op.ignoreAsSuggestion)
    .map((op) => buildPromqlSymbolSuggestion(op));
};

export function getIndexFromPromQLParams({
  params,
  query,
}: ESQLAstPromqlCommand): string | undefined {
  if (params?.entries) {
    const indexEntry = params.entries.find(
      (entry): entry is ESQLMapEntry =>
        isIdentifier(entry.key) && entry.key.name.toLowerCase() === 'index'
    );

    const { value } = indexEntry ?? {};

    if (isList(value) && value.values.length > 0) {
      const listText = value.text?.trim();
      if (listText) {
        return listText;
      }

      const names = value.values
        .map((item) => (isIdentifier(item) || isSource(item) ? item.name : ''))
        .filter(Boolean);

      if (names.length > 0) {
        return names.join(',');
      }
    }

    if ((isIdentifier(value) || isSource(value)) && !value.name.includes(EDITOR_MARKER)) {
      return value.name;
    }
  }

  // Fallback: when "index=value" is last token, parser puts it in query.text
  // Needed by autocomplete and external consumers (e.g. getIndexPatternFromESQLQuery).
  const indexMatch = query?.text?.match(INDEX_PARAM_REGEX);

  // same stuffs of getSourcesFromCommands for the other sources
  return indexMatch?.[1]?.includes(EDITOR_MARKER) ? undefined : indexMatch?.[1];
}

/** Derives ES|QL types from PromQL function signature types.*/
export function getMetricTypesForSignature(
  signatureTypes: PromQLFunctionParamType[]
): readonly string[] {
  if (!signatureTypes.length) {
    return ESQL_NUMBER_TYPES;
  }

  const types = signatureTypes.flatMap((paramType) =>
    paramType === 'string' ? ESQL_STRING_TYPES : ESQL_NUMBER_TYPES
  );

  return Array.from(new Set(types));
}
