/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import type { DefaultActionsSupportedValue } from '../types';
import { createExistsFilter, createFilter } from './create_filter';

interface AddFilterParams {
  filterManager: FilterManager;
  key: string;
  value: DefaultActionsSupportedValue;
  negate: boolean;
  dataViewId?: string;
}

export const addFilter = ({ filterManager, key, value, negate, dataViewId }: AddFilterParams) => {
  filterManager.addFilters(createFilter({ key, value, negate, dataViewId }));
};

interface AddExistsFilterParams {
  filterManager: FilterManager;
  key: string;
  negate: boolean;
  dataViewId?: string;
}
export const addExistsFilter = ({
  filterManager,
  key,
  negate,
  dataViewId,
}: AddExistsFilterParams) => {
  filterManager.addFilters(createExistsFilter({ key, negate, dataViewId }));
};

export const isEmptyFilterValue = (value: Array<string | number | boolean>) =>
  value.length === 0 || value.every((v) => v === '');
