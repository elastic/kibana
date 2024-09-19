/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DashboardPanelState } from '..';
import { esFilters, Filter } from '../../services/data';
import {
  DashboardContainerInput,
  DashboardOptions,
  DashboardPanelMap,
  DashboardState,
} from '../../types';

interface DashboardDiffCommon {
  [key: string]: unknown;
}

type DashboardDiffCommonFilters = DashboardDiffCommon & { filters: Filter[] };

export const diffDashboardContainerInput = (
  originalInput: DashboardContainerInput,
  newInput: DashboardContainerInput
) => {
  return commonDiffFilters<DashboardContainerInput>(
    originalInput as unknown as DashboardDiffCommonFilters,
    newInput as unknown as DashboardDiffCommonFilters,
    ['searchSessionId', 'lastReloadRequestTime', 'executionContext']
  );
};

export const diffDashboardState = (
  original: DashboardState,
  newState: DashboardState
): Partial<DashboardState> => {
  const common = commonDiffFilters<DashboardState>(
    original as unknown as DashboardDiffCommonFilters,
    newState as unknown as DashboardDiffCommonFilters,
    ['viewMode', 'panels', 'options', 'savedQuery', 'expandedPanelId'],
    true
  );

  return {
    ...common,
    ...(panelsAreEqual(original.panels, newState.panels) ? {} : { panels: newState.panels }),
    ...(optionsAreEqual(original.options, newState.options) ? {} : { options: newState.options }),
  };
};

const optionsAreEqual = (optionsA: DashboardOptions, optionsB: DashboardOptions): boolean => {
  const optionKeys = [...Object.keys(optionsA), ...Object.keys(optionsB)];
  for (const key of optionKeys) {
    if (
      Boolean((optionsA as unknown as { [key: string]: boolean })[key]) !==
      Boolean((optionsB as unknown as { [key: string]: boolean })[key])
    ) {
      return false;
    }
  }
  return true;
};

const panelsAreEqual = (panelsA: DashboardPanelMap, panelsB: DashboardPanelMap): boolean => {
  const embeddableIdsA = Object.keys(panelsA);
  const embeddableIdsB = Object.keys(panelsB);
  if (
    embeddableIdsA.length !== embeddableIdsB.length ||
    _.xor(embeddableIdsA, embeddableIdsB).length > 0
  ) {
    return false;
  }
  // embeddable ids are equal so let's compare individual panels.
  for (const id of embeddableIdsA) {
    if (
      Object.keys(
        commonDiff<DashboardPanelState>(
          panelsA[id] as unknown as DashboardDiffCommon,
          panelsB[id] as unknown as DashboardDiffCommon,
          ['panelRefName']
        )
      ).length > 0
    ) {
      return false;
    }
  }

  return true;
};

const commonDiffFilters = <T extends { filters: Filter[] }>(
  originalObj: DashboardDiffCommonFilters,
  newObj: DashboardDiffCommonFilters,
  omitKeys: string[],
  ignorePinned?: boolean
): Partial<T> => {
  const filtersAreDifferent = () =>
    !esFilters.compareFilters(
      originalObj.filters,
      ignorePinned ? newObj.filters.filter((f) => !esFilters.isFilterPinned(f)) : newObj.filters,
      esFilters.COMPARE_ALL_OPTIONS
    );
  const otherDifferences = commonDiff<T>(originalObj, newObj, [...omitKeys, 'filters']);
  return _.cloneDeep({
    ...otherDifferences,
    ...(filtersAreDifferent() ? { filters: newObj.filters } : {}),
  });
};

const commonDiff = <T>(
  originalObj: DashboardDiffCommon,
  newObj: DashboardDiffCommon,
  omitKeys: string[]
) => {
  const differences: Partial<T> = {};
  const keys = [...Object.keys(originalObj), ...Object.keys(newObj)].filter(
    (key) => !omitKeys.includes(key)
  );
  keys.forEach((key) => {
    if (key === undefined) return;
    if (!_.isEqual(originalObj[key], newObj[key])) {
      (differences as { [key: string]: unknown })[key] = newObj[key];
    }
  });
  return differences;
};
