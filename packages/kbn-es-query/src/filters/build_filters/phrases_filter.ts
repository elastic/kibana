/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Filter, FilterMeta, FILTERS } from './types';
import { getPhraseScript, PhraseFilterValue } from './phrase_filter';
import type { DataViewFieldBase, DataViewBase } from '../../es_query';

export type PhrasesFilterMeta = FilterMeta & {
  params: PhraseFilterValue[]; // The unformatted values
  field?: string;
};

export type PhrasesFilter = Filter & {
  meta: PhrasesFilterMeta;
  query: estypes.QueryDslQueryContainer;
};

/**
 * @param filter
 * @returns `true` if a filter is a `PhrasesFilter`
 *
 * @public
 */
export const isPhrasesFilter = (filter: Filter): filter is PhrasesFilter =>
  filter?.meta?.type === FILTERS.PHRASES;

/** @internal */
export const getPhrasesFilterField = (filter: PhrasesFilter) => {
  // Phrases is a newer filter type that has always been created via a constructor that ensures
  // `meta.key` is set to the field name
  return filter.meta.key;
};

/**
 * Creates a filter where the given field matches one or more of the given values
 * params should be an array of values
 * @param field
 * @param params
 * @param indexPattern
 * @returns
 *
 * @public
 */
export const buildPhrasesFilter = (
  field: DataViewFieldBase,
  params: PhraseFilterValue[],
  indexPattern: DataViewBase
) => {
  const index = indexPattern.id;
  const type = FILTERS.PHRASES;
  const key = field.name;

  let should;
  if (field.scripted) {
    should = params.map((v) => ({
      script: getPhraseScript(field, v),
    }));
  } else {
    should = params.map((v) => ({
      match_phrase: {
        [field.name]: v,
      },
    }));
  }

  return {
    meta: { index, type, key, params },
    query: {
      bool: {
        should,
        minimum_should_match: 1,
      },
    },
  } as PhrasesFilter;
};
