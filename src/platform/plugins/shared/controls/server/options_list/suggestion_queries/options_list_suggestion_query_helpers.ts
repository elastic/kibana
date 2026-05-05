/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';

import type { OptionsListSortingType } from '@kbn/controls-schemas';
import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';
import type { EsBucket } from '../types';

export const getSortType = (sort?: OptionsListSortingType) => {
  return sort
    ? { [sort.by]: sort.direction }
    : { [DEFAULT_DSL_OPTIONS_LIST_STATE.sort.by]: DEFAULT_DSL_OPTIONS_LIST_STATE.sort.direction };
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
