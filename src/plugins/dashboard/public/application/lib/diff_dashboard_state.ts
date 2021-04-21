/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { esFilters, Filter } from '../../services/data';
import { DashboardContainerInput, DashboardState } from '../../types';

export const diffDashboardContainerInput = (
  originalInput: DashboardContainerInput,
  newInput: DashboardContainerInput
) => {
  return commonDiff<DashboardContainerInput>(
    (originalInput as unknown) as DashboardDiffCommon,
    (newInput as unknown) as DashboardDiffCommon,
    ['filters', 'searchSessionId', 'lastReloadRequestTime']
  );
};

export const diffDashboardState = (originalState: DashboardState, newState: DashboardState) => {
  return commonDiff<DashboardState>(
    (originalState as unknown) as DashboardDiffCommon,
    (newState as unknown) as DashboardDiffCommon,
    ['viewMode', 'filters']
  );
};

interface DashboardDiffCommon {
  [key: string]: unknown;
  filters: Filter[];
}

const commonDiff = <T extends { filters: Filter[] }>(
  originalObj: DashboardDiffCommon,
  newObj: DashboardDiffCommon,
  omitKeys: string[]
) => {
  const differences: Partial<T> = {};
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
