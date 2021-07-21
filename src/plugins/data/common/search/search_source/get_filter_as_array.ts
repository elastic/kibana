/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction } from 'lodash';
import { Filter } from '../../../common';
import { SearchSourceFields } from './types';

/**
 * Extracts filters from search source and guarantees to return them as an array.
 *
 * A search source with no filters will return an empty array.
 * @public */
export const getFilterAsArray = (filterField: SearchSourceFields['filter']): Filter[] => {
  if (!filterField) {
    return [];
  }

  if (Array.isArray(filterField)) {
    return filterField;
  }

  if (isFunction(filterField)) {
    return getFilterAsArray(filterField());
  }

  return [filterField];
};
