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
  // console.log('Checking if panels are equal....');
  // console.log('panelsA:', panelsA);
  // console.log('panelsB:', panelsB);
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
    // console.log('---> old object: ', panelsA[id], '\n---> new object: ', panelsB[id]);
    // console.log(
    //   '---> old title: ',
    //   panelsA[id].explicitInput.title,
    //   '\n---> new title: ',
    //   panelsB[id].explicitInput.title
    // );

    // debugger;
    const obj = commonDiff<DashboardPanelState>(
      panelsA[id] as unknown as DashboardDiffCommon,
      panelsB[id] as unknown as DashboardDiffCommon,
      ['panelRefName', 'explicitInput']
    );
    if (
      Object.keys(obj).length > 0 ||
      !explicitInputIsEqual(panelsA[id].explicitInput, panelsB[id].explicitInput)
    ) {
      // console.log('Panels are not equal.');
      // console.log('---> Result of commmonDiff:', obj);
      return false;
    }
  }
  // hidePanelTitles
  // title

  // console.log('Panels are equal.');
  return true;
};

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
    // if (key === 'explicitInput') debugger;
    if (key === undefined) return;
    if (!_.isEqual(originalObj[key], newObj[key])) {
      // console.log(`Values at ${key} are not equal:`);
      // console.log('---> Old:', originalObj[key]);
      // console.log('-------> Title: ', originalObj[key].title);
      // console.log('--------> Stringify: ', JSON.stringify(originalObj[key]));
      // console.log('---> New:', newObj[key]);
      // console.log('--------> Stringify: ', JSON.stringify(newObj[key]));
      // console.log('---> Diffs:', difference(originalObj[key], newObj[key]));
      // console.log('-------> Title: ', newObj[key].title);

      (differences as { [key: string]: unknown })[key] = newObj[key];
    }
  });
  return differences;
};
