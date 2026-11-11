/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryLanguage } from '../common';
import { kqlField, kqlValue } from '../common/kql';

export interface SearchState {
  readonly index: string;
  readonly language: QueryLanguage;
  readonly query: string;
}

type Scalar = string | number | boolean;

export type Condition =
  | {
      readonly kind: 'equals';
      readonly field: string;
      readonly fieldType?: string;
      readonly value: Scalar;
    }
  | {
      readonly kind: 'range';
      readonly field: string;
      readonly gte: string | number;
      readonly lt?: string | number;
    }
  | { readonly kind: 'missing'; readonly field: string };

export const LANGUAGE_LABELS: Readonly<Record<QueryLanguage, string>> = {
  kql: 'KQL',
  lucene: 'Lucene',
  dsl: 'Query DSL',
};

const LUCENE_SPECIAL = /([+\-=&|><!(){}[\]^"~*?:\\/\s])/g;

/** Returns a new search that narrows `search` by `condition`, in the same query language. */
export function refineSearch(search: SearchState, condition: Condition): SearchState {
  const { language, query } = search;
  const parent = query.trim();
  switch (language) {
    case 'kql': {
      const clause = toKql(condition);
      return { ...search, query: parent ? `(${parent}) and ${clause}` : clause };
    }
    case 'lucene': {
      const clause = toLucene(condition);
      return { ...search, query: parent ? `(${parent}) AND ${clause}` : clause };
    }
    case 'dsl':
      return { ...search, query: JSON.stringify(combineDsl(parent, toDsl(condition))) };
  }
}

function toKql(condition: Condition): string {
  const field = kqlField(condition.field);
  switch (condition.kind) {
    case 'equals':
      return `${field}: ${kqlValue(condition.value)}`;
    case 'range': {
      const lower = `${field} >= ${kqlValue(condition.gte)}`;
      return condition.lt === undefined
        ? lower
        : `${lower} and ${field} < ${kqlValue(condition.lt)}`;
    }
    case 'missing':
      return `not ${field}: *`;
  }
}

function luceneValue(value: Scalar): string {
  if (typeof value !== 'string') return String(value);
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function toLucene(condition: Condition): string {
  const field = condition.field.replace(LUCENE_SPECIAL, '\\$1');
  switch (condition.kind) {
    case 'equals':
      return `${field}:${luceneValue(condition.value)}`;
    case 'range':
      return condition.lt === undefined
        ? `${field}:[${luceneValue(condition.gte)} TO *]`
        : `${field}:[${luceneValue(condition.gte)} TO ${luceneValue(condition.lt)}}`;
    case 'missing':
      return `NOT _exists_:${field}`;
  }
}

function toDsl(condition: Condition): object {
  const { field } = condition;
  switch (condition.kind) {
    case 'equals':
      return condition.fieldType === 'text' || condition.fieldType === 'match_only_text'
        ? { match_phrase: { [field]: condition.value } }
        : { term: { [field]: condition.value } };
    case 'range':
      return {
        range: {
          [field]: {
            gte: condition.gte,
            ...(condition.lt === undefined ? {} : { lt: condition.lt }),
          },
        },
      };
    case 'missing':
      return { bool: { must_not: { exists: { field } } } };
  }
}

function combineDsl(parent: string, clause: object): object {
  if (!parent) return clause;
  try {
    return { bool: { filter: [JSON.parse(parent), clause] } };
  } catch {
    return clause;
  }
}
