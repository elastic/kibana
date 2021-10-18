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
import { distinctUntilChanged } from 'rxjs/operators';
import {
  ControlGroupContainer,
  ControlGroupInput,
  ControlGroupOutput,
  ControlStyle,
  CONTROL_GROUP_TYPE,
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

  // Because dashboard container stores control group state, any control group changes need to be passed to dashboard container
  subscriptions.add(
    controlGroup.getInput$().subscribe(() => {
      const { panels, controlStyle } = controlGroup.getInput();
      if (!isControlGroupInputEqual()) {
        dashboardContainer.updateInput({ controlGroupInput: { panels, controlStyle } });
      }
    })
  );

  subscriptions.add(
    dashboardContainer
      .getInput$()
      .pipe(
        // skip updates when nothing of interest has changed. This prevents changes in lastReloadRequestTime from overwriting control group input
        distinctUntilChanged(
          (a, b) =>
            !(
              ['controlGroupInput', 'filters', 'timeRange', 'query'] as Array<
                keyof DashboardContainerInput
              >
            )
              .map((key) => deepEqual(a[key], b[key]))
              .includes(false)
        )
      )
      .subscribe(() => {
        let newInput: Partial<ControlGroupInput> = {};
        if (!isControlGroupInputEqual()) {
          newInput = { ...dashboardContainer.getInput().controlGroupInput };
        }
        // pass filters, query and time range down from
        if (
          !compareFilters(
            controlGroup.getInput().filters || [],
            dashboardContainer.getInput().filters || [],
            COMPARE_ALL_OPTIONS
          )
        ) {
          newInput.filters = dashboardContainer.getInput().filters;
        }
        if (
          !deepEqual(controlGroup.getInput().timeRange, dashboardContainer.getInput().timeRange)
        ) {
          newInput.timeRange = dashboardContainer.getInput().timeRange;
        }
        if (!deepEqual(controlGroup.getInput().query, dashboardContainer.getInput().query)) {
          newInput.query = dashboardContainer.getInput().query;
        }
        if (Object.keys(newInput).length > 0) {
          controlGroup.updateInput(newInput);
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
  if (controlGroupInputIsEqual(dashboardState.controlGroupInput, {} as ControlGroupInput)) return;
  dashboardSavedObject.controlGroupInput = {
    controlStyle: dashboardState.controlGroupInput?.controlStyle,
    panelsJSON: JSON.stringify(dashboardState.controlGroupInput?.panels),
  };
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
