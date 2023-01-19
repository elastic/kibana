/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';

import { persistableControlGroupInputIsEqual } from '@kbn/controls-plugin/common';
import { compareFilters, COMPARE_ALL_OPTIONS, isFilterPinned } from '@kbn/es-query';

import { DashboardContainer } from '../../dashboard_container';
import { DashboardContainerByValueInput } from '../../../../../common';
import { areTimesEqual, getPanelLayoutsAreEqual } from './dashboard_diffing_utils';

export interface DiffFunctionProps<Key extends keyof DashboardContainerByValueInput> {
  currentValue: DashboardContainerByValueInput[Key];
  lastValue: DashboardContainerByValueInput[Key];

  currentInput: DashboardContainerByValueInput;
  lastInput: DashboardContainerByValueInput;
  container: DashboardContainer;
}

export type DashboardDiffFunctions = {
  [key in keyof Partial<DashboardContainerByValueInput>]: (
    props: DiffFunctionProps<key>
  ) => boolean | Promise<boolean>;
};

export const isKeyEqual = async (
  key: keyof DashboardContainerByValueInput,
  diffFunctionProps: DiffFunctionProps<typeof key>
) => {
  const propsAsNever = diffFunctionProps as never; // todo figure out why props has conflicting types in some constituents.
  const diffingFunction = dashboardDiffingFunctions[key];
  if (diffingFunction) {
    return diffingFunction?.prototype?.name === 'AsyncFunction'
      ? await diffingFunction(propsAsNever)
      : diffingFunction(propsAsNever);
  }
  return fastIsEqual(diffFunctionProps.currentValue, diffFunctionProps.lastValue);
};

/**
 * A collection of functions which diff individual keys of dashboard state. If a key is missing from this list it is
 * diffed by the default diffing function, fastIsEqual.
 */
export const dashboardDiffingFunctions: DashboardDiffFunctions = {
  panels: async ({ currentValue, lastValue, container }) => {
    if (!getPanelLayoutsAreEqual(currentValue, lastValue)) return false;

    const explicitInputComparePromises = Object.values(currentValue).map(
      (panel) =>
        new Promise<boolean>((resolve, reject) => {
          const embeddableId = panel.explicitInput.id;
          if (!embeddableId) reject();
          try {
            container.untilEmbeddableLoaded(embeddableId).then((embeddable) =>
              embeddable
                .getExplicitInputIsEqual(lastValue[embeddableId].explicitInput)
                .then((isEqual) => {
                  if (isEqual) {
                    // rejecting the promise if the input is equal.
                    reject();
                  } else {
                    // resolving false here means that the panel is unequal. The first promise to resolve this way will return false from this function.
                    resolve(false);
                  }
                })
            );
          } catch (e) {
            reject();
          }
        })
    );

    // If any promise resolves, return false. The catch here is only called if all promises reject which means all panels are equal.
    return await Promise.any(explicitInputComparePromises).catch(() => true);
  },

  filters: ({ currentValue, lastValue }) =>
    compareFilters(
      currentValue.filter((f) => !isFilterPinned(f)),
      lastValue.filter((f) => !isFilterPinned(f)),
      COMPARE_ALL_OPTIONS
    ),

  timeRange: ({ currentValue, lastValue, currentInput }) => {
    if (!currentInput.timeRestore) return true; // if time restore is set to false, time range doesn't count as a change.
    if (
      !areTimesEqual(currentValue?.from, lastValue?.from) ||
      !areTimesEqual(currentValue?.to, lastValue?.to)
    ) {
      return false;
    }
    return true;
  },

  refreshInterval: ({ currentValue, lastValue, currentInput }) => {
    if (!currentInput.timeRestore) return true; // if time restore is set to false, refresh interval doesn't count as a change.
    return fastIsEqual(currentValue, lastValue);
  },

  controlGroupInput: ({ currentValue, lastValue }) =>
    persistableControlGroupInputIsEqual(currentValue, lastValue),

  viewMode: () => false, // When compared view mode is always considered unequal so that it gets backed up.
};
