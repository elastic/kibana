/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';

import {
  OptionsListSortingType,
  OPTIONS_LIST_DEFAULT_SORT,
} from '../../../common/options_list/suggestions_sorting';
import { EsBucket } from '../types';

export const getSortType = (sort?: OptionsListSortingType) => {
  return sort
    ? { [sort.by]: sort.direction }
    : { [OPTIONS_LIST_DEFAULT_SORT.by]: OPTIONS_LIST_DEFAULT_SORT.direction };
};

export const getEscapedRegexQuery = (q: string = '') =>
  q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

export const getEscapedWildcardQuery = (q: string = '') =>
  q.replace(/[?*]/g, (match) => `\\${match}`);

export const getIpBuckets = (
  rawEsResult: any,
  combinedBuckets: EsBucket[],
  type: 'ipv4' | 'ipv6'
) => {
  const results = get(
    rawEsResult,
    `aggregations.suggestions.buckets.${type}.filteredSuggestions.buckets`
  );
  if (results) {
    results.forEach((suggestion: EsBucket) => combinedBuckets.push(suggestion));
  }
};
