/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, DataViewFieldBase } from '../../es_query';
import { FILTERS, type Filter, type FilterMeta } from './types';

export interface ExistsFilterMeta extends FilterMeta {
  type: typeof FILTERS.EXISTS;
  params: {
    field: string;
  };
}

/** @public */
export interface ExistsFilter extends Filter {
  meta: ExistsFilterMeta;
}

/** @public */
export function isExistsFilter(filter: Filter): filter is ExistsFilter {
  return filter.meta.type === FILTERS.EXISTS; // TODO: has(filter, 'query.exists');
}

/** @internal */
export const getExistsFilterField = (filter: ExistsFilter) => {
  return filter.meta.params.field; // filter.query.exists && filter.query.exists.field;
};

/**
 * Builds an `ExistsFilter`
 * @param field field to validate the existence of
 * @param indexPattern index pattern to look for the field in
 * @returns An `ExistsFilter`
 * @public
 */
export function buildExistsFilter(
  field: DataViewFieldBase,
  indexPattern: DataViewBase
): ExistsFilter {
  return {
    meta: {
      type: FILTERS.EXISTS,
      index: indexPattern.id,
      params: { field: field.name },
    },
  };
}

/**
 * Generates the Elasticsearch query DSL corresponding to an `ExistsFilter`.
 * @param filter The `ExistsFilter` to generate the DSL from
 * @public
 */
export function toExistsEsQuery(filter: ExistsFilter): QueryDslQueryContainer {
  return {
    exists: { field: filter.meta.params.field },
  };
}
