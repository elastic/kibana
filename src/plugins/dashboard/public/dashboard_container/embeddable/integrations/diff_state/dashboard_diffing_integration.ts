/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { omit } from 'lodash';
import { AnyAction, Middleware } from '@reduxjs/toolkit';
import { debounceTime, Observable, Subject, switchMap } from 'rxjs';

import { DashboardContainer } from '../../dashboard_container';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainerByValueInput } from '../../../../../common';
import { CHANGE_CHECK_DEBOUNCE } from '../../../../dashboard_constants';
import { isKeyEqual } from './dashboard_diffing_functions';
import { dashboardContainerReducers } from '../../../state/dashboard_container_reducers';

/**
 * An array of reducers which cannot cause unsaved changes. Unsaved changes only compares the explicit input
 * and the last saved input, so we can safely ignore any output reducers, and most componentState reducers.
 */
const reducersToIgnore: Array<keyof typeof dashboardContainerReducers> = [
  'setTimeslice',
  'setFullScreenMode',
  'setSearchSessionId',
  'setExpandedPanelId',
  'setHasUnsavedChanges',
];

const keysToOmitFromSessionStorage: Array<keyof DashboardContainerByValueInput> = [
  'lastReloadRequestTime',
  'searchSessionId',
  'timeslice',

  'timeRange', // Current behaviour expects time range not to be backed up. Revisit this?
  'refreshInterval',
];

export const keysNotConsideredUnsavedChanges: Array<keyof DashboardContainerByValueInput> = [
  'lastReloadRequestTime',
  'searchSessionId',
  'timeslice',
  'viewMode',
];

/**
 * Does an initial diff between @param initialInput and @param initialLastSavedInput, and created a middleware
 * which listens to the redux store and checks for & publishes the unsaved changes on dispatches.
 */
export function startDiffingDashboardState(
  this: DashboardContainer,
  {
    initialInput,
    useSessionBackup,
    setCleanupFunction,
    initialLastSavedInput,
    handleSearchSessionChange,
  }: {
    useSessionBackup?: boolean;
    initialInput: DashboardContainerByValueInput;
    initialLastSavedInput: DashboardContainerByValueInput;
    setCleanupFunction: (cleanupFunction: () => void) => void;
    handleSearchSessionChange?: (changedKeys: Array<keyof DashboardContainerByValueInput>) => void;
  }
) {
  const { dashboardSessionStorage } = pluginServices.getServices();

  const checkForUnsavedChanges = async (
    currentState?: DashboardContainerByValueInput,
    lastState?: DashboardContainerByValueInput
  ): Promise<boolean> => {
    const unsavedChanges = await getUnsavedChanges.bind(this)(lastState, currentState);

    if (useSessionBackup) {
      dashboardSessionStorage.setState(
        this.getDashboardSavedObjectId(),
        omit(unsavedChanges, keysToOmitFromSessionStorage)
      );
    }

    handleSearchSessionChange?.(
      Object.keys(unsavedChanges) as Array<keyof DashboardContainerByValueInput>
    );
    return Object.keys(omit(unsavedChanges, keysNotConsideredUnsavedChanges)).length > 0; // omit view mode because it is always backed up
  };

  const checkForUnsavedChangesSubject$ = new Subject<null>();

  // middleware starts the check for unsaved changes function if the action dispatched could cause them.
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

  // once the dashboard is initialized, start listening to the subject
  this.untilInitialized().then(() => {
    const {
      getState,
      dispatch,
      actions: { setHasUnsavedChanges },
    } = this.getReduxEmbeddableTools();

    const getHasUnsavedChangesSubscription = checkForUnsavedChangesSubject$
      .pipe(
        debounceTime(CHANGE_CHECK_DEBOUNCE),
        switchMap(() => {
          return new Observable((observer) => {
            // checkForUnsavedChanges called with no arguments so it uses the latest state from redux.
            checkForUnsavedChanges().then((hasChanges) => {
              if (observer.closed) return;
              if (getState().componentState.hasUnsavedChanges !== hasChanges) {
                dispatch(setHasUnsavedChanges(hasChanges));
              }
            });
          });
        })
      )
      .subscribe();

    setCleanupFunction(() => getHasUnsavedChangesSubscription.unsubscribe());
  });

  // set initial unsaved changes
  checkForUnsavedChanges(initialInput, initialLastSavedInput).then(
    async (initialUnsavedChanges) => {
      await this.untilInitialized();
      if (!initialUnsavedChanges) return; // early return because we know hasUnsavedChanges has been initialized to false
      const {
        dispatch,
        actions: { setHasUnsavedChanges },
      } = this.getReduxEmbeddableTools();
      dispatch(setHasUnsavedChanges(initialUnsavedChanges));
    }
  );

  return diffingMiddleware;
}

const getCurrentAndLastSavedInput = (
  dashboardContainer: DashboardContainer,
  initialInput?: DashboardContainerByValueInput,
  initialLastSavedInput?: DashboardContainerByValueInput
) => {
  let input = initialInput ?? undefined;
  let lastInput = initialLastSavedInput ?? undefined;
  if (!input || !lastInput) {
    const {
      explicitInput,
      componentState: { lastSavedInput },
    } = dashboardContainer.getReduxEmbeddableTools().getState();
    if (!input) input = explicitInput;
    if (!lastInput) lastInput = lastSavedInput;
  }
  return { input, lastInput };
};

/**
 * Does a shallow diff between @param lastExplicitInput and @param currentExplicitInput and
 * @returns an object out of the keys which are different.
 */
export async function getUnsavedChanges(
  this: DashboardContainer,
  initialLastSavedInput?: DashboardContainerByValueInput,
  initialInput?: DashboardContainerByValueInput
) {
  const { lastInput, input } = getCurrentAndLastSavedInput(
    this,
    initialInput,
    initialLastSavedInput
  );
  const allKeys = [...new Set([...Object.keys(lastInput), ...Object.keys(input)])] as Array<
    keyof DashboardContainerByValueInput
  >;
  const keyComparePromises = allKeys.map(
    (key) =>
      new Promise<{ key: keyof DashboardContainerByValueInput; isEqual: boolean }>((resolve) =>
        isKeyEqual(key, {
          container: this,

          currentValue: input[key],
          currentInput: input,

          lastValue: lastInput[key],
          lastInput,
        }).then((isEqual) => resolve({ key, isEqual }))
      )
  );
  const unsavedChanges = (await Promise.allSettled(keyComparePromises)).reduce(
    (changes, current) => {
      if (current.status === 'fulfilled') {
        const { key, isEqual } = current.value;
        if (!isEqual) (changes as { [key: string]: unknown })[key] = input[key];
      }
      return changes;
    },
    {} as Partial<DashboardContainerByValueInput>
  );
  return unsavedChanges;
}
