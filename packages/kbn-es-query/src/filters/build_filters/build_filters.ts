/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Serializable } from '@kbn/utility-types';
import { Filter, FILTERS } from './types';

import { buildPhraseFilter, PhraseFilterValue } from './phrase_filter';
import { buildPhrasesFilter } from './phrases_filter';
import { buildRangeFilter, RangeFilterParams } from './range_filter';
import { buildExistsFilter } from './exists_filter';

import type { DataViewFieldBase, DataViewBase } from '../../es_query';
import { FilterStateStore } from './types';
import { buildSpatialFilter, GeoFilterParams } from './spatial_filter';

/**
 *
 * @param indexPattern
 * @param field
 * @param type
 * @param negate whether the filter is negated (NOT filter)
 * @param disabled  whether the filter is disabled andwon't be applied to searches
 * @param params
 * @param alias a display name for the filter
 * @param store whether the filter applies to the current application or should be applied to global context
 * @returns
 *
 * @public
 */
export function buildFilter(
  indexPattern: DataViewBase,
  field: DataViewFieldBase,
  type: FILTERS,
  negate: boolean,
  disabled: boolean,
  params: Serializable,
  alias: string | null,
  store?: FilterStateStore
): Filter {
  const filter = buildBaseFilter(indexPattern, field, type, params);
  filter.meta.alias = alias;
  filter.meta.negate = negate;
  filter.meta.disabled = disabled;
  if (store) {
    filter.$state = { store };
  }
  return filter;
}

function buildBaseFilter(
  indexPattern: DataViewBase,
  field: DataViewFieldBase,
  type: FILTERS,
  params: Serializable
): Filter {
  switch (type) {
    case FILTERS.PHRASE:
      return buildPhraseFilter(field, params as PhraseFilterValue, indexPattern);
    case FILTERS.PHRASES:
      return buildPhrasesFilter(field, params as PhraseFilterValue[], indexPattern);
    case FILTERS.RANGE:
      const { from: gte, to: lt } = params as RangeFilterParams;
      return buildRangeFilter(field, { lt, gte }, indexPattern);
    case FILTERS.RANGE_FROM_VALUE:
      return buildRangeFilter(field, params as RangeFilterParams, indexPattern);
    case FILTERS.EXISTS:
      return buildExistsFilter(field, indexPattern);
    case FILTERS.SPATIAL_FILTER:
      console.log(field,params,indexPattern)
      let geoFilterParams:unknown = params
      return buildSpatialFilter(indexPattern,field, geoFilterParams as GeoFilterParams);
    default:
      throw new Error(`Unknown filter type: ${type}`);
  }
}
