/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DashboardContainerInput } from '..';
import { esFilters, Filter } from '../../services/data';
import { DashboardState } from '../../types';

export const diffDashboardContainerInput = (
  originalInput: DashboardContainerInput,
  newInput: DashboardContainerInput
) => {
  const differences: Partial<DashboardContainerInput> = {};
  if (
    !esFilters.compareFilters(
      originalInput.filters,
      newInput.filters,
      esFilters.COMPARE_ALL_OPTIONS
    )
  ) {
    differences.filters = newInput.filters;
  }

  Object.keys(
    _.omit(originalInput, ['filters', 'searchSessionId', 'lastReloadRequestTime', 'switchViewMode'])
  ).forEach((key) => {
    const originalValue = ((originalInput as unknown) as { [key: string]: unknown })[key];
    const newValue = ((newInput as unknown) as { [key: string]: unknown })[key];
    if (!_.isEqual(originalValue, newValue)) {
      (differences as { [key: string]: unknown })[key] = newValue;
    }
  });
  return _.cloneDeep(differences);
};

export const diffDashboardState = (originalState: DashboardState, newState: DashboardState) => {
  return commonDiff(
    (originalState as unknown) as DashboardDiffCommon,
    (newState as unknown) as DashboardDiffCommon,
    ['viewMode', 'filters', 'query']
  );
};

interface DashboardDiffCommon {
  [key: string]: unknown;
  filters: Filter[];
}

const commonDiff = (
  originalObj: DashboardDiffCommon,
  newObj: DashboardDiffCommon,
  omitKeys: string[]
) => {
  const differences: Partial<DashboardContainerInput> = {};
  if (
    !esFilters.compareFilters(originalObj.filters, newObj.filters, esFilters.COMPARE_ALL_OPTIONS)
  ) {
    differences.filters = newObj.filters;
  }

  const keys = [...Object.keys(originalObj), ...Object.keys(newObj)].filter(
    (key) => !omitKeys.includes(key)
  );
  keys.forEach((key) => {
    if (key === undefined) return;
    if (!_.isEqual(originalObj[key], newObj[key])) {
      (differences as { [key: string]: unknown })[key] = newObj[key];
    }
  });
  return _.cloneDeep(differences);
};
