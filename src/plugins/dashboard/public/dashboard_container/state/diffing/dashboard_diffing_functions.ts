/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';

import { COMPARE_ALL_OPTIONS, compareFilters, isFilterPinned } from '@kbn/es-query';

import { DashboardContainerInput } from '../../../../common';
import { embeddableService } from '../../../services/kibana_services';
import { DashboardContainer } from '../../embeddable/dashboard_container';
import { DashboardContainerInputWithoutId } from '../../types';
import { areTimesEqual, getPanelLayoutsAreEqual } from './dashboard_diffing_utils';

export interface DiffFunctionProps<Key extends keyof DashboardContainerInput> {
  currentValue: DashboardContainerInput[Key];
  lastValue: DashboardContainerInput[Key];

  currentInput: DashboardContainerInputWithoutId;
  lastInput: DashboardContainerInputWithoutId;
  container: DashboardContainer;
}

export type DashboardDiffFunctions = {
  [key in keyof Partial<DashboardContainerInput>]: (
    props: DiffFunctionProps<key>
  ) => boolean | Promise<boolean>;
};

export const isKeyEqualAsync = async (
  key: keyof DashboardContainerInput,
  diffFunctionProps: DiffFunctionProps<typeof key>,
  diffingFunctions: DashboardDiffFunctions
) => {
  const propsAsNever = diffFunctionProps as never; // todo figure out why props has conflicting types in some constituents.
  const diffingFunction = diffingFunctions[key];
  if (diffingFunction) {
    return diffingFunction?.prototype?.name === 'AsyncFunction'
      ? await diffingFunction(propsAsNever)
      : diffingFunction(propsAsNever);
  }
  return fastIsEqual(diffFunctionProps.currentValue, diffFunctionProps.lastValue);
};

export const isKeyEqual = (
  key: keyof Omit<DashboardContainerInput, 'panels'>, // only Panels is async
  diffFunctionProps: DiffFunctionProps<typeof key>,
  diffingFunctions: DashboardDiffFunctions
) => {
  const propsAsNever = diffFunctionProps as never; // todo figure out why props has conflicting types in some constituents.
  const diffingFunction = diffingFunctions[key];
  if (!diffingFunction) {
    return fastIsEqual(diffFunctionProps.currentValue, diffFunctionProps.lastValue);
  }

  if (diffingFunction?.prototype?.name === 'AsyncFunction') {
    throw new Error(
      `The function for key "${key}" is async, must use isKeyEqualAsync for asynchronous functions`
    );
  }
  return diffingFunction(propsAsNever);
};

/**
 * A collection of functions which diff individual keys of dashboard state. If a key is missing from this list it is
 * diffed by the default diffing function, fastIsEqual.
 */
export const unsavedChangesDiffingFunctions: DashboardDiffFunctions = {
  panels: async ({ currentValue, lastValue, container }) => {
    if (!getPanelLayoutsAreEqual(currentValue ?? {}, lastValue ?? {})) return false;

    const explicitInputComparePromises = Object.values(currentValue ?? {}).map(
      (panel) =>
        new Promise<boolean>((resolve, reject) => {
          const embeddableId = panel.explicitInput.id;
          if (!embeddableId || embeddableService.reactEmbeddableRegistryHasKey(panel.type)) {
            // if this is a new style embeddable, it will handle its own diffing.
            reject();
            return;
          }
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

  // exclude pinned filters from comparision because pinned filters are not part of application state
  filters: ({ currentValue, lastValue }) =>
    compareFilters(
      (currentValue ?? []).filter((f) => !isFilterPinned(f)),
      (lastValue ?? []).filter((f) => !isFilterPinned(f)),
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

  viewMode: () => false, // When compared view mode is always considered unequal so that it gets backed up.
};
