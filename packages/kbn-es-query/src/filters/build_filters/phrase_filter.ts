/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get, has, isPlainObject } from 'lodash';
import type { Filter, FilterMeta } from './types';
import type { DataViewFieldBase, DataViewBase } from '../../es_query';
import { getConvertedValueForField } from './get_converted_value_for_field';

export type PhraseFilterValue = string | number | boolean;

export type PhraseFilterMeta = FilterMeta & {
  params?: {
    query: PhraseFilterValue; // The unformatted value
  };
  field?: string;
  index?: string;
};

export type PhraseFilter = Filter & {
  meta: PhraseFilterMeta;
  query: {
    match_phrase?: estypes.QueryDslQueryContainer['match_phrase'];
    match?: estypes.QueryDslQueryContainer['match'];
  };
};

export type ScriptedPhraseFilter = Filter & {
  meta: PhraseFilterMeta;
  query: {
    script: {
      script: estypes.InlineScript;
    };
  };
};

/**
 * @param filter
 * @returns `true` if a filter is a `PhraseFilter`
 *
 * @public
 */
export const isPhraseFilter = (filter: Filter): filter is PhraseFilter => {
  const isMatchPhraseQuery = has(filter, 'query.match_phrase');
  const matchQueryPart: estypes.QueryDslMultiMatchQuery[] = get(filter, 'query.match', []);
  const isDeprecatedMatchPhraseQuery =
    Object.values(matchQueryPart).find((params) => params.type === 'phrase') !== undefined;

  return isMatchPhraseQuery || isDeprecatedMatchPhraseQuery;
};

/**
 * @param filter
 * @returns `true` if a filter is a scripted `PhrasesFilter`
 *
 * @public
 */
export const isScriptedPhraseFilter = (filter: Filter): filter is ScriptedPhraseFilter =>
  has(filter, 'query.script.script.params.value');

/** @internal */
export const getPhraseFilterField = (filter: PhraseFilter) => {
  const queryConfig = filter.query.match_phrase ?? filter.query.match ?? {};
  return Object.keys(queryConfig)[0];
};

/**
 * @internal
 */
export const getPhraseFilterValue = (
  filter: PhraseFilter | ScriptedPhraseFilter
): PhraseFilterValue => {
  if (isPhraseFilter(filter)) {
    const queryConfig = filter.query.match_phrase || filter.query.match || {};
    const queryValue = Object.values(queryConfig)[0];
    return isPlainObject(queryValue) ? queryValue.query : queryValue;
  } else {
    return filter.query?.script?.script?.params?.value;
  }
};

/**
 * Creates a filter where the given field matches a given value
 * @param field
 * @param params
 * @param indexPattern
 * @returns `PhraseFilter`
 *
 * @public
 */
export const buildPhraseFilter = (
  field: DataViewFieldBase,
  value: PhraseFilterValue,
  indexPattern: DataViewBase
): PhraseFilter | ScriptedPhraseFilter => {
  const convertedValue = getConvertedValueForField(field, value);

  if (field.scripted) {
    return {
      meta: { index: indexPattern.id, field: field.name } as PhraseFilterMeta,
      query: { script: getPhraseScript(field, value) },
    };
  } else {
    return {
      meta: { index: indexPattern.id },
      query: {
        match_phrase: {
          [field.name]: convertedValue,
        },
      },
    } as PhraseFilter;
  }
};

/** @internal */
export const getPhraseScript = (field: DataViewFieldBase, value: PhraseFilterValue) => {
  const convertedValue = getConvertedValueForField(field, value);
  const script = buildInlineScriptForPhraseFilter(field);

  return {
    script: {
      source: script,
      lang: field.lang,
      params: {
        value: convertedValue,
      },
    } as estypes.InlineScript,
  };
};

/**
 * @internal
 * Takes a scripted field and returns an inline script appropriate for use in a script query.
 * Handles lucene expression and Painless scripts. Other langs aren't guaranteed to generate valid
 * scripts.
 *
 * @param {object} scriptedField A Field object representing a scripted field
 * @returns {string} The inline script string
 */
export const buildInlineScriptForPhraseFilter = (scriptedField: DataViewFieldBase) => {
  // We must wrap painless scripts in a lambda in case they're more than a simple expression
  if (scriptedField.lang === 'painless') {
    return (
      `boolean compare(Supplier s, def v) {return s.get() == v;}` +
      `compare(() -> { ${scriptedField.script} }, params.value);`
    );
  } else {
    return `(${scriptedField.script}) == value`;
  }
};
