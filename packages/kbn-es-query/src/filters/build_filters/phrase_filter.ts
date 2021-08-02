/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { estypes } from '@elastic/elasticsearch';
import { has, isPlainObject } from 'lodash';
import type { FieldFilter, Filter, FilterMeta } from './types';
import type { IndexPatternFieldBase, IndexPatternBase } from '../../es_query';
import { getConvertedValueForField } from './get_converted_value_for_field';

type PhraseFilterValue = string | number | boolean;

export type PhraseFilterMeta = FilterMeta & {
  params?: {
    query: PhraseFilterValue; // The unformatted value
  };
  field?: string;
  index?: string;
};

export type PhraseFilter = Filter & {
  meta: PhraseFilterMeta;
  script?: {
    script: {
      source?: string;
      lang?: estypes.ScriptLanguage;
      params: { [key: string]: PhraseFilterValue };
    };
  };
};

/**
 * @param filter
 * @returns `true` if a filter is a `PhraseFilter`
 *
 * @public
 */
export const isPhraseFilter = (filter: FieldFilter): filter is PhraseFilter => {
  const isMatchPhraseQuery = filter && filter.query && filter.query.match_phrase;

  const isDeprecatedMatchPhraseQuery =
    filter &&
    filter.query &&
    filter.query.match &&
    Object.values(filter.query.match).find((params: any) => params.type === 'phrase');

  return Boolean(isMatchPhraseQuery || isDeprecatedMatchPhraseQuery);
};

/**
 * @param filter
 * @returns `true` if a filter is a scripted `PhrasesFilter`
 *
 * @public
 */
export const isScriptedPhraseFilter = (filter: FieldFilter): filter is PhraseFilter =>
  has(filter, 'script.script.params.value');

/** @internal */
export const getPhraseFilterField = (filter: PhraseFilter) => {
  const queryConfig = filter.query.match_phrase || filter.query.match;
  return Object.keys(queryConfig)[0];
};

/**
 * @internal
 */
export const getPhraseFilterValue = (filter: PhraseFilter): PhraseFilterValue => {
  const queryConfig = filter.query.match_phrase || filter.query.match;
  const queryValue = Object.values(queryConfig)[0] as any;
  return isPlainObject(queryValue) ? queryValue.query : queryValue;
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
  field: IndexPatternFieldBase,
  value: PhraseFilterValue,
  indexPattern: IndexPatternBase
): PhraseFilter => {
  const convertedValue = getConvertedValueForField(field, value);

  if (field.scripted) {
    return {
      meta: { index: indexPattern.id, field: field.name } as PhraseFilterMeta,
      script: getPhraseScript(field, value),
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
export const getPhraseScript = (field: IndexPatternFieldBase, value: PhraseFilterValue) => {
  const convertedValue = getConvertedValueForField(field, value);
  const script = buildInlineScriptForPhraseFilter(field);

  return {
    script: {
      source: script,
      lang: field.lang,
      params: {
        value: convertedValue,
      },
    },
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
export const buildInlineScriptForPhraseFilter = (scriptedField: any) => {
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
