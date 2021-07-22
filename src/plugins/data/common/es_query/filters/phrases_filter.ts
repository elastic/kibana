/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterMeta } from './meta_filter';
import { getPhraseScript } from './phrase_filter';
import { FILTERS } from './index';
import { IndexPatternFieldBase, IndexPatternBase } from '../es_query';

export type PhrasesFilterMeta = FilterMeta & {
  params: string[]; // The unformatted values
  field?: string;
};

export type PhrasesFilter = Filter & {
  meta: PhrasesFilterMeta;
};

export const isPhrasesFilter = (filter: any): filter is PhrasesFilter =>
  filter?.meta?.type === FILTERS.PHRASES;

export const getPhrasesFilterField = (filter: PhrasesFilter) => {
  // Phrases is a newer filter type that has always been created via a constructor that ensures
  // `meta.key` is set to the field name
  return filter.meta.key;
};

// Creates a filter where the given field matches one or more of the given values
// params should be an array of values
export const buildPhrasesFilter = (
  field: IndexPatternFieldBase,
  params: any[],
  indexPattern: IndexPatternBase
) => {
  const index = indexPattern.id;
  const type = FILTERS.PHRASES;
  const key = field.name;

  let should;
  if (field.scripted) {
    should = params.map((v: any) => ({
      script: getPhraseScript(field, v),
    }));
  } else {
    should = params.map((v: any) => ({
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
