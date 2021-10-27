/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { compareFilters, COMPARE_ALL_OPTIONS, Filter } from '@kbn/es-query';
import { distinctUntilChanged, distinctUntilKeyChanged } from 'rxjs/operators';

import { DashboardContainer } from '..';
import { DashboardState } from '../../types';
import { getDefaultDashboardControlGroupInput } from '../../dashboard_constants';
import { DashboardContainerInput, DashboardSavedObject } from '../..';
import { ControlGroupContainer, ControlGroupInput } from '../../../../presentation_util/public';

// only part of the control group input should be stored in dashboard state. The rest is passed down from the dashboard.
export interface DashboardControlGroupInput {
  panels: ControlGroupInput['panels'];
  controlStyle: ControlGroupInput['controlStyle'];
}

interface DiffChecks {
  [key: string]: (a?: unknown, b?: unknown) => boolean;
}

const distinctUntilDiffCheck = <T extends {}>(a: T, b: T, diffChecks: DiffChecks) =>
  !(Object.keys(diffChecks) as Array<keyof T>)
    .map((key) => deepEqual(a[key], b[key]))
    .includes(false);

type DashboardControlGroupCommonKeys = keyof Pick<
  DashboardContainerInput | ControlGroupInput,
  'filters' | 'lastReloadRequestTime' | 'timeRange' | 'query'
>;

export const syncDashboardControlGroup = async ({
  controlGroup,
  dashboardContainer,
}: {
  controlGroup: ControlGroupContainer;
  dashboardContainer: DashboardContainer;
}) => {
  const subscriptions = new Subscription();

  const isControlGroupInputEqual = () =>
    controlGroupInputIsEqual(
      controlGroup.getInput(),
      dashboardContainer.getInput().controlGroupInput
    );

  // Because dashboard container stores control group state, certain control group changes need to be passed up dashboard container
  const controlGroupDiff: DiffChecks = {
    panels: deepEqual,
    controlStyle: deepEqual,
  };

  subscriptions.add(
    controlGroup
      .getInput$()
      .pipe(
        distinctUntilChanged((a, b) =>
          distinctUntilDiffCheck<ControlGroupInput>(a, b, controlGroupDiff)
        )
      )
      .subscribe(() => {
        const { panels, controlStyle } = controlGroup.getInput();
        if (!isControlGroupInputEqual()) {
          dashboardContainer.updateInput({ controlGroupInput: { panels, controlStyle } });
        }
      })
  );

  const dashboardRefetchDiff: DiffChecks = {
    filters: (a, b) =>
      compareFilters((a as Filter[]) ?? [], (b as Filter[]) ?? [], COMPARE_ALL_OPTIONS),
    lastReloadRequestTime: deepEqual,
    timeRange: deepEqual,
    query: deepEqual,
    viewMode: deepEqual,
  };

  // pass down any pieces of input needed to refetch or force refetch data for the controls
  subscriptions.add(
    dashboardContainer
      .getInput$()
      .pipe(
        distinctUntilChanged((a, b) =>
          distinctUntilDiffCheck<DashboardContainerInput>(a, b, dashboardRefetchDiff)
        )
      )
      .subscribe(() => {
        const newInput: { [key: string]: unknown } = {};
        (Object.keys(dashboardRefetchDiff) as DashboardControlGroupCommonKeys[]).forEach((key) => {
          if (
            !dashboardRefetchDiff[key]?.(
              dashboardContainer.getInput()[key],
              controlGroup.getInput()[key]
            )
          ) {
            newInput[key] = dashboardContainer.getInput()[key];
          }
        });
        if (Object.keys(newInput).length > 0) {
          controlGroup.updateInput(newInput);
        }
      })
  );

  // dashboard may reset the control group input when discarding changes. Subscribe to these changes and update accordingly
  subscriptions.add(
    dashboardContainer
      .getInput$()
      .pipe(distinctUntilKeyChanged('controlGroupInput'))
      .subscribe(() => {
        if (!isControlGroupInputEqual()) {
          if (!dashboardContainer.getInput().controlGroupInput) {
            controlGroup.updateInput(getDefaultDashboardControlGroupInput());
            return;
          }
          controlGroup.updateInput({ ...dashboardContainer.getInput().controlGroupInput });
        }
      })
  );

  // when control group outputs filters, force a refresh!
  subscriptions.add(
    controlGroup
      .getOutput$()
      .subscribe(() => dashboardContainer.updateInput({ lastReloadRequestTime: Date.now() }))
  );

  return {
    onDestroyControlGroup: () => {
      subscriptions.unsubscribe();
      controlGroup.destroy();
    },
  };
};

export const controlGroupInputIsEqual = (
  a: DashboardControlGroupInput | undefined,
  b: DashboardControlGroupInput | undefined
) => {
  const defaultInput = getDefaultDashboardControlGroupInput();
  const inputA = {
    panels: a?.panels ?? defaultInput.panels,
    controlStyle: a?.controlStyle ?? defaultInput.controlStyle,
  };
  const inputB = {
    panels: b?.panels ?? defaultInput.panels,
    controlStyle: b?.controlStyle ?? defaultInput.controlStyle,
  };
  if (deepEqual(inputA, inputB)) return true;
  return false;
};

export const serializeControlGroupToDashboardSavedObject = (
  dashboardSavedObject: DashboardSavedObject,
  dashboardState: DashboardState
) => {
  // only save to saved object if control group is not default
  if (controlGroupInputIsEqual(dashboardState.controlGroupInput, {} as ControlGroupInput)) {
    dashboardSavedObject.controlGroupInput = undefined;
    return;
  }
  if (dashboardState.controlGroupInput) {
    dashboardSavedObject.controlGroupInput = {
      controlStyle: dashboardState.controlGroupInput.controlStyle,
      panelsJSON: JSON.stringify(dashboardState.controlGroupInput.panels),
    };
  }
};

export const deserializeControlGroupFromDashboardSavedObject = (
  dashboardSavedObject: DashboardSavedObject
): Omit<ControlGroupInput, 'id'> | undefined => {
  if (!dashboardSavedObject.controlGroupInput) return;

  const defaultControlGroupInput = getDefaultDashboardControlGroupInput();
  return {
    controlStyle:
      dashboardSavedObject.controlGroupInput?.controlStyle ?? defaultControlGroupInput.controlStyle,
    panels: dashboardSavedObject.controlGroupInput?.panelsJSON
      ? JSON.parse(dashboardSavedObject.controlGroupInput?.panelsJSON)
      : {},
  };
};

export const combineDashboardFiltersWithControlGroupFilters = (
  dashboardFilters: Filter[],
  controlGroup: ControlGroupContainer
) => {
  const dashboardFiltersByKey = dashboardFilters.reduce(
    (acc: { [key: string]: Filter }, current) => {
      const key = current.meta.key;
      if (key) acc[key] = current;
      return acc;
    },
    {}
  );
  const controlGroupFiltersByKey = controlGroup
    .getOutput()
    .filters?.reduce((acc: { [key: string]: Filter }, current) => {
      const key = current.meta.key;
      if (key) acc[key] = current;
      return acc;
    }, {});
  const finalFilters = { ...dashboardFiltersByKey, ...(controlGroupFiltersByKey ?? {}) };
  return Object.values(finalFilters);
};
