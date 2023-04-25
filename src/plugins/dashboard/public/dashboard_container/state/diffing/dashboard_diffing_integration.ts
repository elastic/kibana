/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { omit } from 'lodash';
import { AnyAction, Middleware } from 'redux';
import { debounceTime, Observable, startWith, Subject, switchMap } from 'rxjs';

import { DashboardContainerInput } from '../../../../common';
import type { DashboardDiffFunctions } from './dashboard_diffing_functions';
import {
  isKeyEqual,
  shouldRefreshDiffingFunctions,
  unsavedChangesDiffingFunctions,
} from './dashboard_diffing_functions';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainer, DashboardCreationOptions } from '../..';
import { CHANGE_CHECK_DEBOUNCE } from '../../../dashboard_constants';
import { dashboardContainerReducers } from '../dashboard_container_reducers';

/**
 * An array of reducers which cannot cause unsaved changes. Unsaved changes only compares the explicit input
 * and the last saved input, so we can safely ignore any output reducers, and most componentState reducers.
 * This is only for performance reasons, because the diffing function itself can be quite heavy.
 */
export const reducersToIgnore: Array<keyof typeof dashboardContainerReducers> = [
  'setTimeslice',
  'setFullScreenMode',
  'setSearchSessionId',
  'setExpandedPanelId',
  'setHasUnsavedChanges',
];

/**
 * Some keys will often have deviated from their last saved state, but should not persist over reloads
 */
const keysToOmitFromSessionStorage: Array<keyof DashboardContainerInput> = [
  'lastReloadRequestTime',
  'executionContext',
  'searchSessionId',
  'timeslice',
  'id',

  'timeRange', // Current behaviour expects time range not to be backed up. Revisit this?
  'refreshInterval',
];

/**
 * Some keys will often have deviated from their last saved state, but should be
 * ignored when calculating whether or not this dashboard has unsaved changes.
 */
export const keysNotConsideredUnsavedChanges: Array<keyof DashboardContainerInput> = [
  'lastReloadRequestTime',
  'executionContext',
  'searchSessionId',
  'timeslice',
  'viewMode',
  'id',
];

/**
 * input keys that will cause a new session to be created.
 */
const refetchKeys: Array<keyof DashboardContainerInput> = [
  'query',
  'filters',
  'timeRange',
  'timeslice',
  'timeRestore',
  'lastReloadRequestTime',

  // also refetch when chart settings change
  'syncColors',
  'syncCursor',
  'syncTooltips',
];

/**
 * Does an initial diff between @param initialInput and @param initialLastSavedInput, and created a middleware
 * which listens to the redux store and checks for & publishes the unsaved changes on dispatches.
 */
export function startDiffingDashboardState(
  this: DashboardContainer,
  creationOptions?: DashboardCreationOptions
) {
  const checkForUnsavedChangesSubject$ = new Subject<null>();
  this.subscriptions.add(
    checkForUnsavedChangesSubject$
      .pipe(
        startWith(null),
        debounceTime(CHANGE_CHECK_DEBOUNCE),
        switchMap(() => {
          return new Observable((observer) => {
            const {
              explicitInput: currentInput,
              componentState: { lastSavedInput },
            } = this.getState();
            getUnsavedChanges
              .bind(this)(lastSavedInput, currentInput)
              .then((unsavedChanges) => {
                if (observer.closed) return;

                updateUnsavedChangesState.bind(this)(unsavedChanges);
                if (creationOptions?.useSessionStorageIntegration) {
                  backupUnsavedChanges.bind(this)(unsavedChanges);
                }
              });
          });
        })
      )
      .subscribe()
  );
  const diffingMiddleware: Middleware<AnyAction> = (store) => (next) => (action) => {
    const dispatchedActionName = action.type.split('/')?.[1];
    if (
      dispatchedActionName &&
      dispatchedActionName !== 'updateEmbeddableReduxOutput' && // ignore any generic output updates.
      !reducersToIgnore.includes(dispatchedActionName)
    ) {
      checkForUnsavedChangesSubject$.next(null);
    }
    next(action);
  };
  return diffingMiddleware;
}

/**
 * Does a shallow diff between @param lastInput and @param input and
 * @returns an object out of the keys which are different.
 */
export async function getUnsavedChanges(
  this: DashboardContainer,
  lastInput: DashboardContainerInput,
  input: DashboardContainerInput
): Promise<Partial<DashboardContainerInput>> {
  const allKeys = [...new Set([...Object.keys(lastInput), ...Object.keys(input)])] as Array<
    keyof DashboardContainerInput
  >;
  return await getInputChanges(this, lastInput, input, allKeys, unsavedChangesDiffingFunctions);
}

export async function getShouldRefresh(
  this: DashboardContainer,
  lastInput: DashboardContainerInput,
  input: DashboardContainerInput
): Promise<boolean> {
  const inputChanges = await getInputChanges(
    this,
    lastInput,
    input,
    refetchKeys,
    shouldRefreshDiffingFunctions
  );
  return Object.keys(inputChanges).length > 0;
}

async function getInputChanges(
  container: DashboardContainer,
  lastInput: DashboardContainerInput,
  input: DashboardContainerInput,
  keys: Array<keyof DashboardContainerInput>,
  diffingFunctions: DashboardDiffFunctions
): Promise<Partial<DashboardContainerInput>> {
  const keyComparePromises = keys.map(
    (key) =>
      new Promise<{ key: keyof DashboardContainerInput; isEqual: boolean }>((resolve) => {
        if (input[key] === undefined && lastInput[key] === undefined) {
          resolve({ key, isEqual: true });
        }

        isKeyEqual(
          key,
          {
            container,

            currentValue: input[key],
            currentInput: input,

            lastValue: lastInput[key],
            lastInput,
          },
          diffingFunctions
        ).then((isEqual) => resolve({ key, isEqual }));
      })
  );
  const inputChanges = (await Promise.allSettled(keyComparePromises)).reduce((changes, current) => {
    if (current.status === 'fulfilled') {
      const { key, isEqual } = current.value;
      if (!isEqual) (changes as { [key: string]: unknown })[key] = input[key];
    }
    return changes;
  }, {} as Partial<DashboardContainerInput>);
  return inputChanges;
}

function updateUnsavedChangesState(
  this: DashboardContainer,
  unsavedChanges: Partial<DashboardContainerInput>
) {
  // dispatch has unsaved changes state
  const hasChanges = Object.keys(omit(unsavedChanges, keysNotConsideredUnsavedChanges)).length > 0;
  if (this.getState().componentState.hasUnsavedChanges !== hasChanges) {
    this.dispatch.setHasUnsavedChanges(hasChanges);
  }
}

function backupUnsavedChanges(
  this: DashboardContainer,
  unsavedChanges: Partial<DashboardContainerInput>
) {
  const { dashboardSessionStorage } = pluginServices.getServices();
  dashboardSessionStorage.setState(
    this.getDashboardSavedObjectId(),
    omit(unsavedChanges, keysToOmitFromSessionStorage)
  );
}
