/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { compareFilters, COMPARE_ALL_OPTIONS, type Filter } from '@kbn/es-query';
import { debounceTime, distinctUntilChanged, distinctUntilKeyChanged, skip } from 'rxjs/operators';

import {
  ControlGroupInput,
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
  controlGroupInputToRawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { ControlGroupContainer } from '@kbn/controls-plugin/public';

import { DashboardContainer } from '..';
import { DashboardState } from '../../types';
import { DashboardContainerInput } from '../..';

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
    persistableControlGroupInputIsEqual(
      controlGroup.getInput(),
      dashboardContainer.getInput().controlGroupInput
    );

  // Because dashboard container stores control group state, certain control group changes need to be passed up dashboard container
  const controlGroupDiff: DiffChecks = {
    panels: deepEqual,
    controlStyle: deepEqual,
    chainingSystem: deepEqual,
    ignoreParentSettings: deepEqual,
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
        const { panels, controlStyle, chainingSystem, ignoreParentSettings } =
          controlGroup.getInput();
        if (!isControlGroupInputEqual()) {
          dashboardContainer.updateInput({
            controlGroupInput: { panels, controlStyle, chainingSystem, ignoreParentSettings },
          });
        }
      })
  );

  const compareAllFilters = (a?: Filter[], b?: Filter[]) =>
    compareFilters(a ?? [], b ?? [], COMPARE_ALL_OPTIONS);

  const dashboardRefetchDiff: DiffChecks = {
    filters: (a, b) => compareAllFilters(a as Filter[], b as Filter[]),
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
      .pipe(debounceTime(10), distinctUntilKeyChanged('controlGroupInput'))
      .subscribe(() => {
        if (!isControlGroupInputEqual()) {
          if (!dashboardContainer.getInput().controlGroupInput) {
            controlGroup.updateInput(getDefaultControlGroupInput());
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
      .pipe(
        distinctUntilChanged(({ filters: filtersA }, { filters: filtersB }) =>
          compareAllFilters(filtersA, filtersB)
        ),
        skip(1) // skip first filter output because it will have been applied in initialize
      )
      .subscribe(() => dashboardContainer.updateInput({ lastReloadRequestTime: Date.now() }))
  );

  subscriptions.add(
    controlGroup
      .getOutput$()
      .pipe(
        distinctUntilChanged(({ timeslice: timesliceA }, { timeslice: timesliceB }) =>
          _.isEqual(timesliceA, timesliceB)
        )
      )
      .subscribe(({ timeslice }) => {
        dashboardContainer.updateInput({ timeslice });
      })
  );

  return {
    onDestroyControlGroup: () => {
      subscriptions.unsubscribe();
      controlGroup.destroy();
    },
  };
};

export const serializeControlGroupInput = (
  controlGroupInput: DashboardState['controlGroupInput']
) => {
  // only save to saved object if control group is not default
  if (
    !controlGroupInput ||
    persistableControlGroupInputIsEqual(controlGroupInput, getDefaultControlGroupInput())
  ) {
    return undefined;
  }
  return controlGroupInputToRawControlGroupAttributes(controlGroupInput);
};

export const combineDashboardFiltersWithControlGroupFilters = (
  dashboardFilters: Filter[],
  controlGroup: ControlGroupContainer
): Filter[] => {
  return [...dashboardFilters, ...(controlGroup.getOutput().filters ?? [])];
};
