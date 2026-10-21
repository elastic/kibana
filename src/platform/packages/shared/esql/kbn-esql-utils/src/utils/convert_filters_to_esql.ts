/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Filter,
  type PhraseFilter,
  type PhrasesFilter,
  type RangeFilter,
  type ExistsFilter,
  type CombinedFilter,
  type QueryStringFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isRangeFilter,
  isExistsFilter,
  isCombinedFilter,
  isQueryStringFilter,
  isMatchAllFilter,
  isScriptedPhraseFilter,
  isScriptedRangeFilter,
  getPhraseFilterField,
  getPhraseFilterValue,
  getFilterField,
  BooleanRelation,
} from '@kbn/es-query';
import { sanitazeESQLInput } from './sanitaze_input';
import { escapeStringValue } from './append_to_query/utils';

export interface FilterTranslationResult {
  /** Combined WHERE expression fragment (all translatable filters ANDed), empty string if none */
  esqlExpression: string;
  /** Filters that could not be translated to ES|QL */
  untranslatableFilters: Filter[];
}

/**
 * Converts an array of Elasticsearch Query DSL filters to an ES|QL WHERE clause expression.
 * Disabled filters are skipped. Negated filters are wrapped with NOT.
 * Untranslatable filter types (custom, spatial, scripted) are returned separately.
 */
export const convertFiltersToESQLExpression = (filters: Filter[]): FilterTranslationResult => {
  const translatedExpressions: string[] = [];
  const untranslatableFilters: Filter[] = [];

  for (const filter of filters) {
    if (filter.meta?.disabled) {
      continue;
    }

    const negate = filter.meta?.negate ?? false;
    const expression = translateSingleFilter(filter, negate);

    if (expression === null) {
      untranslatableFilters.push(filter);
      continue;
    }

    // skip match_all which returns empty string
    if (expression === '') {
      continue;
    }

    translatedExpressions.push(expression);
  }

  return {
    esqlExpression: translatedExpressions.join(' AND '),
    untranslatableFilters,
  };
};

const translateSingleFilter = (filter: Filter, negate: boolean): string | null => {
  // Scripted filters are not translatable — check before phrase/range
  if (isScriptedPhraseFilter(filter) || isScriptedRangeFilter(filter)) {
    return null;
  }

  // Exists filter handles negation natively: IS NOT NULL vs IS NULL
  if (isExistsFilter(filter)) {
    return translateExistsFilter(filter, negate);
  }

  if (isPhraseFilter(filter)) {
    return wrapWithNot(translatePhraseFilter(filter), negate);
  }

  if (isPhrasesFilter(filter)) {
    return wrapWithNot(translatePhrasesFilter(filter), negate);
  }

  if (isRangeFilter(filter)) {
    return wrapWithNot(translateRangeFilter(filter), negate);
  }

  if (isCombinedFilter(filter)) {
    return wrapWithNot(translateCombinedFilter(filter), negate);
  }

  if (isQueryStringFilter(filter)) {
    return wrapWithNot(translateQueryStringFilter(filter), negate);
  }

  if (isMatchAllFilter(filter)) {
    return '';
  }

  return null;
};

const wrapWithNot = (expression: string | null, negate: boolean): string | null => {
  if (expression === null || expression === '') {
    return expression;
  }
  return negate ? `NOT (${expression})` : expression;
};

const translatePhraseFilter = (filter: PhraseFilter): string | null => {
  const field = getPhraseFilterField(filter);
  if (!field) {
    return null;
  }

  const value = getPhraseFilterValue(filter);
  if (value === undefined || value === null) {
    return null;
  }

  const escapedField = escapeFieldName(field);
  return `${escapedField} : ${formatESQLValue(value)}`;
};

const translatePhrasesFilter = (filter: PhrasesFilter): string | null => {
  const field = filter.meta?.key;
  if (!field) {
    return null;
  }

  const values = filter.meta?.params;
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const escapedField = escapeFieldName(field);

  if (values.length === 1) {
    return `${escapedField} : ${formatESQLValue(values[0])}`;
  }

  const matchClauses = values.map((v) => `${escapedField} : ${formatESQLValue(v)}`);
  return `(${matchClauses.join(' OR ')})`;
};

const translateRangeFilter = (filter: RangeFilter): string | null => {
  const field = getFilterField(filter) ?? filter.meta?.key;
  if (!field) {
    return null;
  }

  const rangeParams = filter.query?.range?.[field];
  if (!rangeParams) {
    return null;
  }

  const escapedField = escapeFieldName(field);
  const parts: string[] = [];

  if (rangeParams.gte !== undefined) {
    parts.push(`${escapedField} >= ${formatRangeValue(rangeParams.gte)}`);
  } else if (rangeParams.gt !== undefined) {
    parts.push(`${escapedField} > ${formatRangeValue(rangeParams.gt)}`);
  }

  if (rangeParams.lte !== undefined) {
    parts.push(`${escapedField} <= ${formatRangeValue(rangeParams.lte)}`);
  } else if (rangeParams.lt !== undefined) {
    parts.push(`${escapedField} < ${formatRangeValue(rangeParams.lt)}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' AND ');
};

const translateExistsFilter = (filter: ExistsFilter, negate: boolean): string | null => {
  const field = filter.query?.exists?.field;
  if (!field) {
    return null;
  }

  const escapedField = escapeFieldName(field);
  return negate ? `${escapedField} IS NULL` : `${escapedField} IS NOT NULL`;
};

const translateCombinedFilter = (filter: CombinedFilter): string | null => {
  const { relation, params: subFilters } = filter.meta;

  if (!Array.isArray(subFilters) || subFilters.length === 0) {
    return null;
  }

  const joiner = relation === BooleanRelation.OR ? ' OR ' : ' AND ';
  const subExpressions: string[] = [];

  for (const subFilter of subFilters) {
    const subNegate = subFilter.meta?.negate ?? false;
    const expression = translateSingleFilter(subFilter, subNegate);
    if (expression === null) {
      // If any sub-filter is untranslatable, the whole combined filter is untranslatable
      return null;
    }
    if (expression === '') {
      continue;
    }
    subExpressions.push(expression);
  }

  if (subExpressions.length === 0) {
    return '';
  }

  if (subExpressions.length === 1) {
    return subExpressions[0];
  }

  return `(${subExpressions.join(joiner)})`;
};

const translateQueryStringFilter = (filter: QueryStringFilter): string | null => {
  const queryString = filter.query?.query_string?.query;
  if (!queryString) {
    return null;
  }

  return `QSTR(${escapeStringValue(queryString)})`;
};

const escapeFieldName = (fieldName: string): string => {
  return sanitazeESQLInput(fieldName) ?? `\`${fieldName}\``;
};

/**
 * Formats a range filter value for ES|QL. Numeric strings (e.g. "1") are
 * output unquoted so ES|QL treats them as numbers, not keywords.
 */
const formatRangeValue = (value: string | number): string => {
  if (typeof value === 'number') {
    return String(value);
  }
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return String(num);
  }
  return escapeStringValue(value);
};

const formatESQLValue = (value: string | number | boolean): string => {
  if (typeof value === 'string') {
    return escapeStringValue(value);
  }
  return String(value);
};
