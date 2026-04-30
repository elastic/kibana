/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';

type ComposerParamValue = string | number | Array<string | number>;

export interface InlineEsqlVariablesResult {
  /** Query with all resolvable `?param` / `??param` tokens substituted. */
  query: string;
  /**
   * Tokens (with their `?` / `??` prefix) that remain in the output query
   * because no Control resolved them, the value was unsubstitutable, or
   * Composer rejected the substitution.
   */
  unresolved: string[];
}

export const esqlTimeLiteralIsDirectlySubstitutable = (v: ESQLControlVariable): boolean =>
  v.type === ESQLVariableType.TIME_LITERAL && typeof v.value === 'string' && v.value.length > 0;

/**
 * Composer's `inlineParam` supports: string / number / homogeneous non-empty
 * arrays of those (emitted as list literals, e.g. `("a", "b")`) / identifiers
 * via `??`. `time_literal` is excluded because Composer has no duration-aware
 * mode — a string value gets quoted and breaks the query.
 */
export const esqlControlVariableIsComposerInlinable = (v: ESQLControlVariable): boolean => {
  switch (v.type) {
    case ESQLVariableType.TIME_LITERAL:
      return false;
    case ESQLVariableType.MULTI_VALUES: {
      const { value } = v;
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        (typeof value[0] === 'string' || typeof value[0] === 'number') &&
        value.every((el) => typeof el === typeof value[0])
      );
    }
    case ESQLVariableType.VALUES:
      return typeof v.value === 'string' || typeof v.value === 'number';
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return typeof v.value === 'string';
    default:
      return false;
  }
};

const PLACEHOLDER_RE = /\?\??[A-Za-z_]\w*/g;

/**
 * Names the alerting v2 rule executor substitutes itself with the rule's time
 * window at execution time. They are valid in a
 * persisted rule and must not be flagged as unresolved.
 */
const RESERVED_RULE_PARAM_NAMES: ReadonlySet<string> = new Set(['_tstart', '_tend']);

const placeholderName = (token: string): string => token.replace(/^\?\??/, '');

const findPlaceholderTokens = (query: string): string[] => [
  ...new Set(
    (query.match(PLACEHOLDER_RE) ?? []).filter(
      (token) => !RESERVED_RULE_PARAM_NAMES.has(placeholderName(token))
    )
  ),
];

type PlaceholderShape = 'value' | 'identifier';

const naturalPlaceholderShape = (v: ESQLControlVariable): PlaceholderShape => {
  switch (v.type) {
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return 'identifier';
    default:
      return 'value';
  }
};

const collectPlaceholderShapesByName = (query: string): Map<string, Set<PlaceholderShape>> => {
  const byName = new Map<string, Set<PlaceholderShape>>();
  for (const token of query.match(PLACEHOLDER_RE) ?? []) {
    const name = placeholderName(token);
    const shape: PlaceholderShape = token.startsWith('??') ? 'identifier' : 'value';
    let shapes = byName.get(name);
    if (!shapes) {
      shapes = new Set();
      byName.set(name, shapes);
    }
    shapes.add(shape);
  }
  return byName;
};

/**
 * Inline `?param` / `??param` Control bindings into an ES|QL query.
 */
export const inlineEsqlVariables = (
  query: string,
  esqlVariables: ESQLControlVariable[] | undefined
): InlineEsqlVariablesResult => {
  if (!esqlVariables || esqlVariables.length === 0) {
    return { query, unresolved: findPlaceholderTokens(query) };
  }

  // Step 1: TIME_LITERAL — direct substitution (Composer would quote the value).
  let processedQuery = query;
  for (const v of esqlVariables) {
    if (esqlTimeLiteralIsDirectlySubstitutable(v)) {
      const escapedKey = v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedQuery = processedQuery.replace(
        new RegExp(`(?<!\\?)\\?${escapedKey}(?!\\w)`, 'g'),
        v.value as string
      );
    }
  }

  // Step 2: Composer — value/identifier inlining for everything else.
  const shapesByName = collectPlaceholderShapesByName(processedQuery);
  const params = esqlVariables.reduce<Record<string, ComposerParamValue>>((acc, v) => {
    if (!esqlControlVariableIsComposerInlinable(v)) {
      return acc;
    }
    const seenShapes = shapesByName.get(v.key);
    if (!seenShapes || seenShapes.size !== 1) {
      return acc;
    }
    if (!seenShapes.has(naturalPlaceholderShape(v))) {
      return acc;
    }
    acc[v.key] = v.value as ComposerParamValue;
    return acc;
  }, {});

  let inlinedQuery = processedQuery;
  if (Object.keys(params).length > 0) {
    try {
      inlinedQuery = esql(processedQuery, params).inlineParams().print('basic');
    } catch (err) {
      inlinedQuery = processedQuery;
    }
  }

  return { query: inlinedQuery, unresolved: findPlaceholderTokens(inlinedQuery) };
};
