/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PromQLFunctionDefinitionTypes,
  type PromQLFunctionDefinition,
  type PromQLFunctionParamType,
} from '../types';
import { promqlFunctionDefinitions } from '../generated/promql_functions';
import { promqlOperatorDefinitions } from '../generated/promql_operators';
import type { ESQLAstPromqlCommand, ESQLMapEntry } from '../../../types';
import { EDITOR_MARKER } from '../constants';
import { isIdentifier, isList, isSource } from '../../../ast/is';

/* Returns the PromQL function definition matching the provided name. */
export const getPromqlFunctionDefinition = (
  name: string | undefined
): PromQLFunctionDefinition | undefined => {
  if (!name) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();

  return promqlFunctionDefinitions.find(
    ({ name: functionName }) => functionName.toLowerCase() === normalizedName
  );
};

/* Returns the PromQL operator definition matching the provided operator symbol. */
export const getPromqlOperatorDefinition = (
  operator: string | undefined
): PromQLFunctionDefinition | undefined => {
  if (!operator) {
    return undefined;
  }

  const normalizedOperator = operator.toLowerCase();

  return promqlOperatorDefinitions.find(
    ({ operator: symbol, name: definitionName, signatures }) =>
      (symbol ?? definitionName)?.toLowerCase() === normalizedOperator &&
      signatures.some(({ params }) => params.length >= 2) // exclude unary opearators
  );
};

/* Extracts param types for a specific PromQL function parameter index. */
export function getPromqlFunctionParamTypes(
  name: string | undefined,
  paramIndex: number
): PromQLFunctionParamType[] {
  const definition = getPromqlFunctionDefinition(name);
  if (!definition?.signatures.length) {
    return [];
  }

  const { signatures } = definition;

  return signatures
    .map((signature) => signature.params[paramIndex]?.type)
    .filter((paramType): paramType is PromQLFunctionParamType => Boolean(paramType));
}

/* Extracts rhs param types for a PromQL binary operator from operator signatures. */
export const getPromqlBinaryOperatorParamTypes = (
  operator: string,
  paramIndex: number
): PromQLFunctionParamType[] => {
  const definition = getPromqlOperatorDefinition(operator);
  if (!definition) {
    return [];
  }

  const { signatures } = definition;

  return signatures
    .map((signature) => signature.params[paramIndex]?.type)
    .filter((paramType): paramType is PromQLFunctionParamType => Boolean(paramType));
};

/* Reports whether a PromQL function is an across-series aggregation. */
export const isPromqlAcrossSeriesFunction = (name: string): boolean =>
  promqlFunctionDefinitions.some(
    ({ name: fnName, type }) =>
      fnName.toLowerCase() === name.toLowerCase() &&
      type === PromQLFunctionDefinitionTypes.ACROSS_SERIES
  );

const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';
const PRE_GROUPED_AGG_REGEX = new RegExp(
  `\\b(${IDENTIFIER_PATTERN})\\s+(?:by|without)\\s*\\([^)]*\\)\\s*$`,
  'i'
);

/* Extracts the aggregation name from a pre-grouped pattern like "sum by (labels) ". */
export function getPreGroupedAggregationName(textBeforeCursor: string): string | undefined {
  const match = textBeforeCursor.trimEnd().match(PRE_GROUPED_AGG_REGEX);
  if (!match) {
    return undefined;
  }

  return isPromqlAcrossSeriesFunction(match[1]) ? match[1] : undefined;
}

/* Extracts the index parameter from parsed params, with query-text fallback for trailing tokens. */
const INDEX_PARAM_REGEX = /\bindex\s*=\s*(\S+)/i;

export function getIndexFromPromQLParams({
  params,
  query,
}: ESQLAstPromqlCommand): string | undefined {
  const { entries } = params ?? {};

  if (entries) {
    const indexEntry = entries.find(
      (entry): entry is ESQLMapEntry =>
        isIdentifier(entry.key) && entry.key.name.toLowerCase() === 'index'
    );

    const value = indexEntry?.value;

    if (isList(value) && value.values.length > 0) {
      const { text, values } = value;
      const listText = text?.trim();
      if (listText) {
        return listText;
      }

      const names = values
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

  const indexValue = query?.text?.match(INDEX_PARAM_REGEX)?.[1];

  return indexValue?.includes(EDITOR_MARKER) ? undefined : indexValue;
}
