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
  isEsqlFilter,
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

    // These filters are on columns that the query creates, so they can't be used in a WHERE after
    // the source command, where the columns do not exist yet. See `convertEsqlFiltersToESQLExpression`
    if (isEsqlFilter(filter)) {
      untranslatableFilters.push(filter);
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

/**
 * Converts the filters on the columns that an ES|QL query creates (`kind: 'esql'`) to a WHERE expression
 * for the end of that query, where the columns exist. The other filters are ignored.
 * The match operator is not used as it can't be used on the columns that a query creates.
 */
export const convertEsqlFiltersToESQLExpression = (filters: Filter[]): string => {
  const expressions: string[] = [];

  for (const filter of filters) {
    if (!isEsqlFilter(filter) || filter.meta?.disabled) {
      continue;
    }

    const expression = translateEsqlFilter(filter, filter.meta?.negate ?? false);
    if (expression) {
      expressions.push(expression);
    }
  }

  return expressions.join(' AND ');
};

const translateEsqlFilter = (filter: Filter, negate: boolean): string | null => {
  const field = filter.meta?.key;
  if (!field) {
    return null;
  }

  if (isExistsFilter(filter)) {
    return translateExistsFilter(filter, negate);
  }

  let expression: string | null = null;
  if (isPhrasesFilter(filter)) {
    expression = translatePhrasesFilter(filter, 'exact');
  } else if (isPhraseFilter(filter)) {
    expression = translatePhraseFilter(filter, 'exact');
  }
  if (!expression || !negate) {
    return expression;
  }

  // The NOT of ES|QL drops the rows without a value, but a negated DSL filter keeps the documents
  // without the field, so the rows without a value are kept
  return `(${escapeFieldName(field)} IS NULL OR NOT (${expression}))`;
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

/**
 * Checks that a column, that can have several values, has any of the values, like the phrases filters of DSL.
 * An operator like IN evaluates to null on a multivalued column, and MV_INTERSECTS needs the same type on both
 * sides. The type of the column is not known, so the numbers are compared as doubles and the other values as
 * strings, which works for any type of column.
 * There is one call for all the values of a type, as Elasticsearch rejects an expression with too many
 * parentheses, which a chain of checks with one per value reaches with a few hundred values.
 */
const getMultiValueCheck = (
  escapedField: string,
  values: Array<string | number | boolean>
): string => {
  const strings = values.filter((value): value is string => typeof value === 'string');
  const numbers = values.filter((value): value is number => typeof value === 'number');
  const booleans = values.filter((value): value is boolean => typeof value === 'boolean');
  const formatValues = (valuesToFormat: Array<string | number | boolean>) =>
    valuesToFormat.map(formatESQLValue).join(', ');

  const checks: string[] = [];
  if (strings.length) {
    checks.push(`MV_INTERSECTS(TO_STRING(${escapedField}), [${formatValues(strings)}])`);
  }
  if (numbers.length) {
    checks.push(`MV_INTERSECTS(TO_DOUBLE(${escapedField}), TO_DOUBLE([${formatValues(numbers)}]))`);
  }
  if (booleans.length) {
    checks.push(`MV_INTERSECTS(${escapedField}, [${formatValues(booleans)}])`);
  }
  return checks.length === 1 ? checks[0] : `(${checks.join(' OR ')})`;
};

/**
 * `match` uses the match operator, that works on the fields of the index right after the source command.
 * `exact` is for the columns that a query creates, where the match operator can't be used.
 */
type PhraseTranslationMode = 'match' | 'exact';

const translatePhraseFilter = (
  filter: PhraseFilter,
  mode: PhraseTranslationMode = 'match'
): string | null => {
  const field = getPhraseFilterField(filter);
  if (!field) {
    return null;
  }

  const value = getPhraseFilterValue(filter);
  if (!isESQLLiteral(value)) {
    return null;
  }

  const escapedField = escapeFieldName(field);
  return `${escapedField} ${mode === 'exact' ? '==' : ':'} ${formatESQLValue(value)}`;
};

const translatePhrasesFilter = (
  filter: PhrasesFilter,
  mode: PhraseTranslationMode = 'match'
): string | null => {
  const field = filter.meta?.key;
  if (!field) {
    return null;
  }

  const values = filter.meta?.params;
  if (!Array.isArray(values) || values.length === 0 || !values.every(isESQLLiteral)) {
    return null;
  }

  const escapedField = escapeFieldName(field);

  if (mode === 'exact') {
    return getMultiValueCheck(escapedField, values);
  }

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

/**
 * The values of the filters can come from the URL or from a saved object, and they are written into the
 * query, so only the ones that can be a literal are accepted. Anything else would be written as it is.
 */
const isESQLLiteral = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

const formatESQLValue = (value: string | number | boolean): string => {
  if (typeof value === 'string') {
    return escapeStringValue(value);
  }
  return String(value);
};
