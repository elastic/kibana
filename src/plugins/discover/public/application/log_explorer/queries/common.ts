/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource } from '@kbn/data-plugin/public';
import {
  AggregateQuery,
  Filter,
  MatchAllRangeFilter,
  Query,
  RangeFilter,
  ScriptedRangeFilter,
} from '@kbn/es-query';

export const copyWithCommonParameters =
  ({
    size,
    filters,
    query,
    timeRangeFilter,
  }: {
    size?: number;
    filters: Filter[];
    query: Query | AggregateQuery | undefined;
    timeRangeFilter: RangeFilter | ScriptedRangeFilter | MatchAllRangeFilter | undefined;
  }) =>
  (searchSource: ISearchSource) =>
    searchSource
      .createCopy()
      .setField('filter', [...(timeRangeFilter != null ? [timeRangeFilter] : []), ...filters])
      .setField('size', size)
      .setField('fields', ['*']) // NOTE: Requests all fields to help assist with populating "Available fields". This can likely be changed after the Lens / Discover field list consolidation efforts.
      .setField('query', query);
