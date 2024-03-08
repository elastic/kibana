/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compareFilters, COMPARE_ALL_OPTIONS, type Filter } from '@kbn/es-query';
import deepEqual from 'fast-deep-equal';
import { isEqual } from 'lodash';
import { Observable } from 'rxjs';
import { distinctUntilChanged, skip } from 'rxjs/operators';

import { ControlGroupInput } from '@kbn/controls-plugin/common';
import { ControlGroupContainer } from '@kbn/controls-plugin/public';

import { DashboardContainerInput } from '../../../../../common';
import { DashboardContainer } from '../../dashboard_container';

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

  const compareAllFilters = (a?: Filter[], b?: Filter[]) =>
    compareFilters(a ?? [], b ?? [], COMPARE_ALL_OPTIONS);

  const dashboardRefetchDiff: DiffChecks = {
    filters: (a, b) => compareAllFilters(a as Filter[], b as Filter[]),
    timeRange: deepEqual,
    query: deepEqual,
    viewMode: deepEqual,
  };

  // pass down any pieces of input needed to refetch or force refetch data for the controls
  this.integrationSubscriptions.add(
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

  // when control group outputs filters, force a refresh!
  this.integrationSubscriptions.add(
    this.controlGroup
      .getOutput$()
      .pipe(
        distinctUntilChanged(({ filters: filtersA }, { filters: filtersB }) =>
          compareAllFilters(filtersA, filtersB)
        ),
        skip(1) // skip first filter output because it will have been applied in initialize
      )
      .subscribe(() => this.forceRefresh(false)) // we should not reload the control group when the control group output changes - otherwise, performance is severely impacted
  );

  this.integrationSubscriptions.add(
    this.controlGroup
      .getOutput$()
      .pipe(
        distinctUntilChanged(({ timeslice: timesliceA }, { timeslice: timesliceB }) =>
          isEqual(timesliceA, timesliceB)
        )
      )
      .subscribe(({ timeslice }) => {
        if (!isEqual(timeslice, this.getInput().timeslice)) {
          this.dispatch.setTimeslice(timeslice);
        }
      })
  );

  // the Control Group needs to know when any dashboard children are loading in order to know when to move on to the next time slice when playing.
  this.integrationSubscriptions.add(
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
