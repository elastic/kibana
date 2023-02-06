/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { identity, pickBy } from 'lodash';
import { Observable, Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { compareFilters, COMPARE_ALL_OPTIONS, type Filter } from '@kbn/es-query';
import { debounceTime, distinctUntilChanged, distinctUntilKeyChanged, skip } from 'rxjs/operators';

import {
  ControlGroupInput,
  CONTROL_GROUP_TYPE,
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
} from '@kbn/controls-plugin/common';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { ControlGroupContainer, ControlGroupOutput } from '@kbn/controls-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainerByValueInput } from '../../../../../common';

interface DiffChecks {
  [key: string]: (a?: unknown, b?: unknown) => boolean;
}

const distinctUntilDiffCheck = <T extends {}>(a: T, b: T, diffChecks: DiffChecks) =>
  !(Object.keys(diffChecks) as Array<keyof T>)
    .map((key) => deepEqual(a[key], b[key]))
    .includes(false);

type DashboardControlGroupCommonKeys = keyof Pick<
  DashboardContainerByValueInput | ControlGroupInput,
  'filters' | 'lastReloadRequestTime' | 'timeRange' | 'query'
>;

export async function startControlGroupIntegration(
  this: DashboardContainer,
  initialInput: DashboardContainerByValueInput
): Promise<ControlGroupContainer | undefined> {
  const {
    embeddable: { getEmbeddableFactory },
  } = pluginServices.getServices();
  const controlsGroupFactory = getEmbeddableFactory<
    ControlGroupInput,
    ControlGroupOutput,
    ControlGroupContainer
  >(CONTROL_GROUP_TYPE);
  const { filters, query, timeRange, viewMode, controlGroupInput, id } = initialInput;
  const controlGroup = await controlsGroupFactory?.create({
    id: `control_group_${id ?? 'new_dashboard'}`,
    ...getDefaultControlGroupInput(),
    ...pickBy(controlGroupInput, identity), // undefined keys in initialInput should not overwrite defaults
    timeRange,
    viewMode,
    filters,
    query,
  });
  if (!controlGroup || isErrorEmbeddable(controlGroup)) {
    return;
  }

  this.untilInitialized().then(() => startSyncingDashboardControlGroup.bind(this)());
  await controlGroup.untilInitialized();
  return controlGroup;
}

async function startSyncingDashboardControlGroup(this: DashboardContainer) {
  if (!this.controlGroup) return;
  const subscriptions = new Subscription();

  const {
    actions: { setControlGroupState },
    dispatch,
  } = this.getReduxEmbeddableTools();

  const isControlGroupInputEqual = () =>
    persistableControlGroupInputIsEqual(
      this.controlGroup!.getInput(),
      this.getInputAsValueType().controlGroupInput
    );

  // Because dashboard container stores control group state, certain control group changes need to be passed up dashboard container
  const controlGroupDiff: DiffChecks = {
    panels: deepEqual,
    controlStyle: deepEqual,
    chainingSystem: deepEqual,
    ignoreParentSettings: deepEqual,
  };
  subscriptions.add(
    this.controlGroup
      .getInput$()
      .pipe(
        distinctUntilChanged((a, b) =>
          distinctUntilDiffCheck<ControlGroupInput>(a, b, controlGroupDiff)
        )
      )
      .subscribe(() => {
        const { panels, controlStyle, chainingSystem, ignoreParentSettings } =
          this.controlGroup!.getInput();
        if (!isControlGroupInputEqual()) {
          dispatch(
            setControlGroupState({ panels, controlStyle, chainingSystem, ignoreParentSettings })
          );
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
    (this.getInput$() as Readonly<Observable<DashboardContainerByValueInput>>)
      .pipe(
        distinctUntilChanged((a, b) =>
          distinctUntilDiffCheck<DashboardContainerByValueInput>(a, b, dashboardRefetchDiff)
        )
      )
      .subscribe(() => {
        const newInput: { [key: string]: unknown } = {};
        (Object.keys(dashboardRefetchDiff) as DashboardControlGroupCommonKeys[]).forEach((key) => {
          if (
            !dashboardRefetchDiff[key]?.(
              this.getInputAsValueType()[key],
              this.controlGroup!.getInput()[key]
            )
          ) {
            newInput[key] = this.getInputAsValueType()[key];
          }
        });
        if (Object.keys(newInput).length > 0) {
          this.controlGroup!.updateInput(newInput);
        }
      })
  );

  // dashboard may reset the control group input when discarding changes. Subscribe to these changes and update accordingly
  subscriptions.add(
    (this.getInput$() as Readonly<Observable<DashboardContainerByValueInput>>)
      .pipe(debounceTime(10), distinctUntilKeyChanged('controlGroupInput'))
      .subscribe(() => {
        if (!isControlGroupInputEqual()) {
          if (!this.getInputAsValueType().controlGroupInput) {
            this.controlGroup!.updateInput(getDefaultControlGroupInput());
            return;
          }
          this.controlGroup!.updateInput({
            ...this.getInputAsValueType().controlGroupInput,
          });
        }
      })
  );

  // when control group outputs filters, force a refresh!
  subscriptions.add(
    this.controlGroup
      .getOutput$()
      .pipe(
        distinctUntilChanged(({ filters: filtersA }, { filters: filtersB }) =>
          compareAllFilters(filtersA, filtersB)
        ),
        skip(1) // skip first filter output because it will have been applied in initialize
      )
      .subscribe(() => this.updateInput({ lastReloadRequestTime: Date.now() }))
  );

  subscriptions.add(
    this.controlGroup
      .getOutput$()
      .pipe(
        distinctUntilChanged(({ timeslice: timesliceA }, { timeslice: timesliceB }) =>
          _.isEqual(timesliceA, timesliceB)
        )
      )
      .subscribe(({ timeslice }) => {
        this.updateInput({ timeslice });
      })
  );

  // the Control Group needs to know when any dashboard children are loading in order to know when to move on to the next time slice when playing.
  subscriptions.add(
    this.getAnyChildOutputChange$().subscribe(() => {
      if (!this.controlGroup) {
        return;
      }

      for (const child of Object.values(this.children)) {
        const isLoading = child.getOutput().loading;
        if (isLoading) {
          this.controlGroup.anyControlOutputConsumerLoading$.next(true);
          return;
        }
      }
      this.controlGroup.anyControlOutputConsumerLoading$.next(false);
    })
  );

  return {
    stopSyncingWithControlGroup: () => {
      subscriptions.unsubscribe();
    },
  };
}

export const combineDashboardFiltersWithControlGroupFilters = (
  dashboardFilters: Filter[],
  controlGroup: ControlGroupContainer
): Filter[] => {
  return [...dashboardFilters, ...(controlGroup.getOutput().filters ?? [])];
};
