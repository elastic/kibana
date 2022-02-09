/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { xor, omit, isEmpty } from 'lodash';
import fastIsEqual from 'fast-deep-equal';
import { compareFilters, COMPARE_ALL_OPTIONS, type Filter, isFilterPinned } from '@kbn/es-query';

import { DashboardContainerInput } from '../..';
import { controlGroupInputIsEqual } from './dashboard_control_group';
import { DashboardOptions, DashboardPanelMap, DashboardState } from '../../types';
import { IEmbeddable } from '../../services/embeddable';

const stateKeystoIgnore = ['expandedPanelId', 'fullScreenMode', 'savedQuery', 'viewMode', 'tags'];
type DashboardStateToCompare = Omit<DashboardState, typeof stateKeystoIgnore[number]>;

const inputKeystoIgnore = ['searchSessionId', 'lastReloadRequestTime', 'executionContext'] as const;
type DashboardInputToCompare = Omit<DashboardContainerInput, typeof inputKeystoIgnore[number]>;

/**
 * The diff dashboard Container method is used to sync redux state and the dashboard container input.
 * It should eventually be replaced with a usage of the dashboardContainer.isInputEqual function
 **/
export const diffDashboardContainerInput = (
  originalInput: DashboardContainerInput,
  newInput: DashboardContainerInput
): Partial<DashboardContainerInput> => {
  const { filters: originalFilters, ...commonOriginal } = omit(originalInput, inputKeystoIgnore);
  const { filters: newFilters, ...commonNew } = omit(newInput, inputKeystoIgnore);

  const commonInputDiff: Partial<DashboardInputToCompare> = commonDiff(commonOriginal, commonNew);
  const filtersAreEqual = getFiltersAreEqual(originalInput.filters, newInput.filters);

  return {
    ...commonInputDiff,
    ...(filtersAreEqual ? {} : { filters: newInput.filters }),
  };
};

/**
 * The diff dashboard state method compares dashboard state keys to determine which state keys
 * have changed, and therefore should be backed up.
 **/
export const diffDashboardState = async ({
  originalState,
  newState,
  getEmbeddable,
}: {
  originalState: DashboardState;
  newState: DashboardState;
  getEmbeddable: (id: string) => Promise<IEmbeddable>;
}): Promise<Partial<DashboardState>> => {
  if (!newState.timeRestore) {
    stateKeystoIgnore.push('timeRange');
  }
  const {
    controlGroupInput: originalControlGroupInput,
    options: originalOptions,
    filters: originalFilters,
    panels: originalPanels,
    ...commonCompareOriginal
  } = omit(originalState, stateKeystoIgnore);
  const {
    controlGroupInput: newControlGroupInput,
    options: newOptions,
    filters: newFilters,
    panels: newPanels,
    ...commonCompareNew
  } = omit(newState, stateKeystoIgnore);

  const commonStateDiff: Partial<DashboardStateToCompare> = commonDiff(
    commonCompareOriginal,
    commonCompareNew
  );

  const panelsAreEqual = await getPanelsAreEqual(
    originalState.panels,
    newState.panels,
    getEmbeddable
  );
  const optionsAreEqual = getOptionsAreEqual(originalState.options, newState.options);
  const filtersAreEqual = getFiltersAreEqual(originalState.filters, newState.filters, true);
  const controlGroupIsEqual = controlGroupInputIsEqual(
    originalState.controlGroupInput,
    newState.controlGroupInput
  );

  return {
    ...commonStateDiff,
    ...(panelsAreEqual ? {} : { panels: newState.panels }),
    ...(filtersAreEqual ? {} : { filters: newState.filters }),
    ...(optionsAreEqual ? {} : { options: newState.options }),
    ...(controlGroupIsEqual ? {} : { controlGroupInput: newState.controlGroupInput }),
  };
};

const getFiltersAreEqual = (
  filtersA: Filter[],
  filtersB: Filter[],
  ignorePinned?: boolean
): boolean => {
  return compareFilters(
    filtersA,
    ignorePinned ? filtersB.filter((f) => !isFilterPinned(f)) : filtersB,
    COMPARE_ALL_OPTIONS
  );
};

const getOptionsAreEqual = (optionsA: DashboardOptions, optionsB: DashboardOptions): boolean => {
  const optionKeys = [
    ...(Object.keys(optionsA) as Array<keyof DashboardOptions>),
    ...(Object.keys(optionsB) as Array<keyof DashboardOptions>),
  ];
  for (const key of optionKeys) {
    if (Boolean(optionsA[key]) !== Boolean(optionsB[key])) return false;
  }
  return true;
};

const getPanelsAreEqual = async (
  originalPanels: DashboardPanelMap,
  newPanels: DashboardPanelMap,
  getEmbeddable: (id: string) => Promise<IEmbeddable>
): Promise<boolean> => {
  const originalEmbeddableIds = Object.keys(originalPanels);
  const newEmbeddableIds = Object.keys(newPanels);

  const embeddableIdDiff = xor(originalEmbeddableIds, newEmbeddableIds);
  if (embeddableIdDiff.length > 0) {
    return false;
  }

  // embeddable ids are equal so let's compare individual panels.
  for (const embeddableId of newEmbeddableIds) {
    const {
      explicitInput: originalExplicitInput,
      panelRefName: panelRefA,
      ...commonPanelDiffOriginal
    } = originalPanels[embeddableId];
    const {
      explicitInput: newExplicitInput,
      panelRefName: panelRefB,
      ...commonPanelDiffNew
    } = newPanels[embeddableId];

    if (!isEmpty(commonDiff(commonPanelDiffOriginal, commonPanelDiffNew))) return false;

    // the position and type of this embeddable is equal. Now we compare the embeddable input
    const embeddable = await getEmbeddable(embeddableId);
    if (!(await embeddable.getExplicitInputIsEqual(originalExplicitInput))) return false;
  }
  return true;
};

const commonDiff = <T>(originalObj: Partial<T>, newObj: Partial<T>) => {
  const differences: Partial<T> = {};
  const keys = [
    ...(Object.keys(originalObj) as Array<keyof T>),
    ...(Object.keys(newObj) as Array<keyof T>),
  ];
  for (const key of keys) {
    if (key === undefined) continue;
    if (!fastIsEqual(originalObj[key], newObj[key])) differences[key] = newObj[key];
  }
  return differences;
};
