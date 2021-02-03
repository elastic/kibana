/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IIndexPattern, IFieldType } from '../..';
import {
  Filter,
  FILTERS,
  FilterStateStore,
  FilterMeta,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
  buildExistsFilter,
} from '.';

export function buildFilter(
  indexPattern: IIndexPattern,
  field: IFieldType,
  type: FILTERS,
  negate: boolean,
  disabled: boolean,
  params: any,
  alias: string | null,
  store: FilterStateStore
): Filter {
  const filter = buildBaseFilter(indexPattern, field, type, params);
  filter.meta.alias = alias;
  filter.meta.negate = negate;
  filter.meta.disabled = disabled;
  filter.$state = { store };
  return filter;
}

export function buildCustomFilter(
  indexPatternString: string,
  queryDsl: any,
  disabled: boolean,
  negate: boolean,
  alias: string | null,
  store: FilterStateStore
): Filter {
  const meta: FilterMeta = {
    index: indexPatternString,
    type: FILTERS.CUSTOM,
    disabled,
    negate,
    alias,
  };
  const filter: Filter = { ...queryDsl, meta };
  filter.$state = { store };
  return filter;
}

function buildBaseFilter(
  indexPattern: IIndexPattern,
  field: IFieldType,
  type: FILTERS,
  params: any
): Filter {
  switch (type) {
    case 'phrase':
      return buildPhraseFilter(field, params, indexPattern);
    case 'phrases':
      return buildPhrasesFilter(field, params, indexPattern);
    case 'range':
      const newParams = { gte: params.from, lt: params.to };
      return buildRangeFilter(field, newParams, indexPattern);
    case 'exists':
      return buildExistsFilter(field, indexPattern);
    default:
      throw new Error(`Unknown filter type: ${type}`);
  }
}
