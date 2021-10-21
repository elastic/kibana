/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';

import { compareFilters, COMPARE_ALL_OPTIONS, Filter } from '@kbn/es-query';
import { distinctUntilChanged, distinctUntilKeyChanged } from 'rxjs/operators';
import {
  ControlGroupContainer,
  ControlGroupInput,
  ControlGroupOutput,
  CONTROL_GROUP_TYPE,
  ControlStyle,
} from '../../../../presentation_util/public';
import { DashboardContainer } from '..';
import { EmbeddableStart, isErrorEmbeddable } from '../../services/embeddable';
import { DashboardContainerInput, DashboardSavedObject } from '../..';
import { DashboardState } from '../../types';

// only part of the control group input should be stored in dashboard state. The rest is passed down from the dashboard.
export interface DashboardControlGroupInput {
  panels: ControlGroupInput['panels'];
  controlStyle: ControlGroupInput['controlStyle'];
}

type DashboardControlGroupCommonKeys = keyof Pick<
  DashboardContainerInput | ControlGroupInput,
  'filters' | 'lastReloadRequestTime' | 'timeRange' | 'query'
>;

export const getDefaultDashboardControlGroupInput = () => ({
  controlStyle: 'oneLine' as ControlStyle,
  panels: {},
});

export const createAndSyncDashboardControlGroup = async ({
  dashboardContainer,
  getEmbeddableFactory,
}: {
  dashboardContainer: DashboardContainer;
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
}) => {
  const subscriptions = new Subscription();
  const controlsGroupFactory = getEmbeddableFactory<
    ControlGroupInput,
    ControlGroupOutput,
    ControlGroupContainer
  >(CONTROL_GROUP_TYPE);
  const controlGroup = await controlsGroupFactory?.create({
    ...getDefaultDashboardControlGroupInput(),
    ...(dashboardContainer.getInput().controlGroupInput ?? {}),
    id: uuid.v4(),
  });
  if (!controlGroup || isErrorEmbeddable(controlGroup)) return;

  const isControlGroupInputEqual = () =>
    controlGroupInputIsEqual(
      controlGroup.getInput(),
      dashboardContainer.getInput().controlGroupInput
    );

  // Because dashboard container stores control group state, certain control group changes need to be passed up dashboard container
  subscriptions.add(
    controlGroup.getInput$().subscribe(() => {
      const { panels, controlStyle } = controlGroup.getInput();
      if (!isControlGroupInputEqual()) {
        dashboardContainer.updateInput({ controlGroupInput: { panels, controlStyle } });
      }
    })
  );

  const refetchDiffMethods: {
    [key: string]: (a?: unknown, b?: unknown) => boolean;
  } = {
    filters: (a, b) =>
      compareFilters((a as Filter[]) ?? [], (b as Filter[]) ?? [], COMPARE_ALL_OPTIONS),
    lastReloadRequestTime: deepEqual,
    timeRange: deepEqual,
    query: deepEqual,
  };

  // pass down any pieces of input needed to refetch or force refetch data for the controls
  subscriptions.add(
    dashboardContainer
      .getInput$()
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            !(Object.keys(refetchDiffMethods) as DashboardControlGroupCommonKeys[])
              .map((key) => deepEqual(a[key], b[key]))
              .includes(false)
        )
      )
      .subscribe(() => {
        const newInput: { [key: string]: unknown } = {};
        (Object.keys(refetchDiffMethods) as DashboardControlGroupCommonKeys[]).forEach((key) => {
          if (
            !refetchDiffMethods[key]?.(
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

  return { onDestroyControlGroup: () => subscriptions.unsubscribe(), controlGroup };
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
