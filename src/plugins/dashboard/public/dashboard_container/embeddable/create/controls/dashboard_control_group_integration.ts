/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { Observable } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { compareFilters, COMPARE_ALL_OPTIONS, type Filter } from '@kbn/es-query';
import { debounceTime, distinctUntilChanged, distinctUntilKeyChanged, skip } from 'rxjs/operators';

import {
  ControlGroupInput,
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
} from '@kbn/controls-plugin/common';
import { ControlGroupContainer } from '@kbn/controls-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { DashboardContainerInput } from '../../../../../common';

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

export function startSyncingDashboardControlGroup(this: DashboardContainer) {
  if (!this.controlGroup) return;
  const isControlGroupInputEqual = () =>
    persistableControlGroupInputIsEqual(
      this.controlGroup!.getInput(),
      this.getInput().controlGroupInput
    );

  // Because dashboard container stores control group state, certain control group changes need to be passed up dashboard container
  const controlGroupDiff: DiffChecks = {
    panels: deepEqual,
    controlStyle: deepEqual,
    chainingSystem: deepEqual,
    ignoreParentSettings: deepEqual,
  };
  this.subscriptions.add(
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
          this.dispatch.setControlGroupState({
            panels,
            controlStyle,
            chainingSystem,
            ignoreParentSettings,
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
  this.subscriptions.add(
    (this.getInput$() as Readonly<Observable<DashboardContainerInput>>)
      .pipe(
        distinctUntilChanged((a, b) =>
          distinctUntilDiffCheck<DashboardContainerInput>(a, b, dashboardRefetchDiff)
        )
      )
      .subscribe(() => {
        const newInput: { [key: string]: unknown } = {};
        (Object.keys(dashboardRefetchDiff) as DashboardControlGroupCommonKeys[]).forEach((key) => {
          if (
            !dashboardRefetchDiff[key]?.(this.getInput()[key], this.controlGroup!.getInput()[key])
          ) {
            newInput[key] = this.getInput()[key];
          }
        });
        if (Object.keys(newInput).length > 0) {
          this.controlGroup!.updateInput(newInput);
        }
      })
  );

  // dashboard may reset the control group input when discarding changes. Subscribe to these changes and update accordingly
  this.subscriptions.add(
    (this.getInput$() as Readonly<Observable<DashboardContainerInput>>)
      .pipe(debounceTime(10), distinctUntilKeyChanged('controlGroupInput'))
      .subscribe(() => {
        if (!isControlGroupInputEqual()) {
          if (!this.getInput().controlGroupInput) {
            this.controlGroup!.updateInput(getDefaultControlGroupInput());
            return;
          }
          this.controlGroup!.updateInput({
            ...this.getInput().controlGroupInput,
          });
        }
      })
  );

  // when control group outputs filters, force a refresh!
  this.subscriptions.add(
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

  this.subscriptions.add(
    this.controlGroup
      .getOutput$()
      .pipe(
        distinctUntilChanged(({ timeslice: timesliceA }, { timeslice: timesliceB }) =>
          isEqual(timesliceA, timesliceB)
        )
      )
      .subscribe(({ timeslice }) => {
        this.updateInput({ timeslice });
      })
  );

  // the Control Group needs to know when any dashboard children are loading in order to know when to move on to the next time slice when playing.
  this.subscriptions.add(
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
}

export const combineDashboardFiltersWithControlGroupFilters = (
  dashboardFilters: Filter[],
  controlGroup: ControlGroupContainer
): Filter[] => {
  return [...dashboardFilters, ...(controlGroup.getOutput().filters ?? [])];
};
