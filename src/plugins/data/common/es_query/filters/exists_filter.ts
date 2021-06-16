/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterMeta } from './meta_filter';
import { IFieldType } from '../../index_patterns';
import { MinimalIndexPattern } from '..';

export type ExistsFilterMeta = FilterMeta;

export interface FilterExistsProperty {
  field: any;
}

export type ExistsFilter = Filter & {
  meta: ExistsFilterMeta;
  exists?: FilterExistsProperty;
};

export const isExistsFilter = (filter: any): filter is ExistsFilter => filter && filter.exists;

export const getExistsFilterField = (filter: ExistsFilter) => {
  return filter.exists && filter.exists.field;
};

export const buildExistsFilter = (field: IFieldType, indexPattern: MinimalIndexPattern) => {
  return {
    meta: {
      index: indexPattern.id,
    },
    exists: {
      field: field.name,
    },
  } as ExistsFilter;
};
