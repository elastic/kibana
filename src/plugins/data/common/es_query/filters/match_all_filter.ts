/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FilterMeta } from './meta_filter';

export interface MatchAllFilterMeta extends FilterMeta {
  field: any;
  formattedValue: string;
}

export type MatchAllFilter = Filter & {
  meta: MatchAllFilterMeta;
  match_all: any;
};

export const isMatchAllFilter = (filter: any): filter is MatchAllFilter =>
  filter && filter.match_all;
