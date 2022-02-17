/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { has } from 'lodash';
import type { Filter, FilterMeta } from './types';

export interface MatchAllFilterMeta extends FilterMeta {
  field: string;
  formattedValue: string;
}

export type MatchAllFilter = Filter & {
  meta: MatchAllFilterMeta;
  query: {
    match_all: estypes.QueryDslMatchAllQuery;
  };
};

/**
 * @param filter
 * @returns `true` if a filter is an `MatchAllFilter`
 *
 * @public
 */
export const isMatchAllFilter = (filter: Filter): filter is MatchAllFilter =>
  has(filter, 'query.match_all');
