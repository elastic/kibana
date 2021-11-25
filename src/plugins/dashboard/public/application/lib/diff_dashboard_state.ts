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
import { EmbeddableInput } from '../../services/embeddable';
import {
  DashboardContainerInput,
  DashboardOptions,
  DashboardPanelMap,
  DashboardState,
} from '../../types';
import { controlGroupInputIsEqual } from './dashboard_control_group';

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
    ['viewMode', 'panels', 'options', 'savedQuery', 'expandedPanelId', 'controlGroupInput'],
    true
  );

  return {
    ...common,
    ...(panelsAreEqual(original.panels, newState.panels) ? {} : { panels: newState.panels }),
    ...(optionsAreEqual(original.options, newState.options) ? {} : { options: newState.options }),
    ...(controlGroupInputIsEqual(original.controlGroupInput, newState.controlGroupInput)
      ? {}
      : { controlGroupInput: newState.controlGroupInput }),
  };
};

const optionsAreEqual = (optionsA: DashboardOptions, optionsB: DashboardOptions): boolean => {
  const optionKeys = [
    ...(Object.keys(optionsA) as Array<keyof DashboardOptions>),
    ...(Object.keys(optionsB) as Array<keyof DashboardOptions>),
  ];
  for (const key of optionKeys) {
    if (Boolean(optionsA[key]) !== Boolean(optionsB[key])) {
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
    const obj = commonDiff<DashboardPanelState>(
      panelsA[id] as unknown as DashboardDiffCommon,
      panelsB[id] as unknown as DashboardDiffCommon,
      ['panelRefName', 'explicitInput']
    );
    if (
      Object.keys(obj).length > 0 ||
      !explicitInputIsEqual(panelsA[id].explicitInput, panelsB[id].explicitInput)
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Need to compare properties of explicitInput *directly* in order to handle special comparisons for 'title'
 * and 'hidePanelTitles.' For example, if some object 'obj1' has 'obj1[title] = undefined' and some other
 * object `obj2' simply does not have the key `title,' we want obj1 to still equal obj2 - in normal comparisons
 * without this special case, `obj1 != obj2.'
 * @param originalInput
 * @param newInput
 */
const explicitInputIsEqual = (
  originalInput: EmbeddableInput,
  newInput: EmbeddableInput
): boolean => {
  const diffs = commonDiff<DashboardPanelState>(originalInput, newInput, [
    'hidePanelTitles',
    'title',
  ]);
  const hidePanelsAreEqual =
    Boolean(originalInput.hidePanelTitles) === Boolean(newInput.hidePanelTitles);
  const titlesAreEqual = originalInput.title === newInput.title;
  return Object.keys(diffs).length === 0 && hidePanelsAreEqual && titlesAreEqual;
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
