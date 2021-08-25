/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { has } from 'lodash';
import type { IndexPatternFieldBase, IndexPatternBase } from '../../es_query';
import type { Filter, FilterMeta } from './types';

/** @public */
export type ExistsFilter = Filter & {
  meta: FilterMeta;
  exists?: {
    field: string;
  };
};

/**
 * @param filter
 * @returns `true` if a filter is an `ExistsFilter`
 *
 * @public
 */
export const isExistsFilter = (filter: Filter): filter is ExistsFilter => has(filter, 'exists');

/**
 * @internal
 */
export const getExistsFilterField = (filter: ExistsFilter) => {
  return filter.exists && filter.exists.field;
};

/**
 * Builds an `ExistsFilter`
 * @param field field to validate the existence of
 * @param indexPattern index pattern to look for the field in
 * @returns An `ExistsFilter`
 *
 * @public
 */
export const buildExistsFilter = (field: IndexPatternFieldBase, indexPattern: IndexPatternBase) => {
  return {
    meta: {
      index: indexPattern.id,
    },
    exists: {
      field: field.name,
    },
  } as ExistsFilter;
};
