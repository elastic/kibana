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

type ComposerParamValue = string | number | boolean | Array<string | number | boolean>;

/**
 * Whether a TIME_LITERAL variable can be spliced verbatim into the query string.
 * Composer would quote the value (turning `15m` into `"15m"`), breaking duration
 * arithmetic, so these variables bypass Composer entirely. Any non-empty string
 * value is accepted; format validation is the control's responsibility.
 */
export function esqlTimeLiteralIsDirectlySubstitutable(v: ESQLControlVariable): boolean {
  return (
    v.type === ESQLVariableType.TIME_LITERAL &&
    typeof v.value === 'string' &&
    (v.value as string).length > 0
  );
}

/**
 * Composer's `inlineParam` supports: string / number / boolean / homogeneous
 * non-empty arrays of those (emitted as list literals, e.g. `("a", "b")`) /
 * identifiers via `??`. `time_literal` is excluded because Composer has no
 * duration-aware mode — a string value gets quoted and breaks the query.
 */
export function esqlControlVariableIsComposerInlinable(v: ESQLControlVariable): boolean {
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
      return (
        typeof v.value === 'string' || typeof v.value === 'number' || typeof v.value === 'boolean'
      );
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return typeof v.value === 'string';
    default:
      return false;
  }
}

export const inlineEsqlVariables = (
  query: string,
  esqlVariables: ESQLControlVariable[] | undefined
): string => {
  if (!esqlVariables || esqlVariables.length === 0) {
    return query;
  }

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

  const params = esqlVariables.reduce<Record<string, ComposerParamValue>>((acc, v) => {
    if (esqlControlVariableIsComposerInlinable(v)) {
      acc[v.key] = v.value as ComposerParamValue;
    }
    return acc;
  }, {});
  if (Object.keys(params).length === 0) {
    return processedQuery;
  }
  try {
    return esql(processedQuery, params).inlineParams().print('basic');
  } catch {
    return processedQuery;
  }
};

const PLACEHOLDER_RE = /\?\??[A-Za-z_]\w*/g;

/**
 * Names of `?param` / `??param` tokens in `query` that cannot be resolved:
 * no matching Control, an empty/mixed-type `multi_values`, or any variable that
 * is neither Composer-inlinable nor directly substitutable.
 */
export const findUnresolvedVariables = (
  query: string,
  esqlVariables: ESQLControlVariable[] | undefined
): string[] => {
  const tokens = query.match(PLACEHOLDER_RE);
  if (!tokens || tokens.length === 0) return [];
  const byKey = new Map((esqlVariables ?? []).map((v) => [v.key, v]));
  const unresolved = new Set<string>();
  for (const token of tokens) {
    const name = token.replace(/^\?\??/, '');
    const variable = byKey.get(name);
    if (
      !variable ||
      (!esqlControlVariableIsComposerInlinable(variable) &&
        !esqlTimeLiteralIsDirectlySubstitutable(variable))
    ) {
      unresolved.add(token);
    }
  }
  return [...unresolved];
};
