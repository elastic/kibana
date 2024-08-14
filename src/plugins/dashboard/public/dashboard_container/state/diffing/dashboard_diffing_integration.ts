/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { AnyAction, Middleware } from 'redux';
import { combineLatest, debounceTime, skipWhile, startWith, switchMap } from 'rxjs';
import { DashboardContainer, DashboardCreationOptions } from '../..';
import { DashboardContainerInput } from '../../../../common';
import { CHANGE_CHECK_DEBOUNCE } from '../../../dashboard_constants';
import { pluginServices } from '../../../services/plugin_services';
import { UnsavedPanelState } from '../../types';
import { dashboardContainerReducers } from '../dashboard_container_reducers';
import { isKeyEqualAsync, unsavedChangesDiffingFunctions } from './dashboard_diffing_functions';
import { PANELS_CONTROL_GROUP_KEY } from '../../../services/dashboard_backup/dashboard_backup_service';

/**
 * An array of reducers which cannot cause unsaved changes. Unsaved changes only compares the explicit input
 * and the last saved input, so we can safely ignore any output reducers, and most componentState reducers.
 * This is only for performance reasons, because the diffing function itself can be quite heavy.
 */
export const reducersToIgnore: Array<keyof typeof dashboardContainerReducers> = [
  'setTimeslice',
  'setFullScreenMode',
  'setExpandedPanelId',
  'setHasUnsavedChanges',
];

/**
 * Some keys will often have deviated from their last saved state, but should not persist over reloads
 */
const keysToOmitFromSessionStorage: Array<keyof DashboardContainerInput> = [
  'lastReloadRequestTime',
  'executionContext',
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
  'timeslice',
  'viewMode',
  'id',
];

/**
 * build middleware that fires an event any time a reducer that could cause unsaved changes is run
 */
export function getDiffingMiddleware(this: DashboardContainer) {
  const diffingMiddleware: Middleware<AnyAction> = (store) => (next) => (action) => {
    const dispatchedActionName = action.type.split('/')?.[1];
    if (
      dispatchedActionName &&
      dispatchedActionName !== 'updateEmbeddableReduxOutput' && // ignore any generic output updates.
      !reducersToIgnore.includes(dispatchedActionName)
    ) {
      this.anyReducerRun.next(null);
    }
    next(action);
  };
  return diffingMiddleware;
}

/**
 * Does an initial diff between @param initialInput and @param initialLastSavedInput, and creates a middleware
 * which listens to the redux store and pushes updates to the `hasUnsavedChanges` and `backupUnsavedChanges` behaviour
 * subjects so that the corresponding subscriptions can dispatch updates as necessary
 */
export function startDiffingDashboardState(
  this: DashboardContainer,
  creationOptions?: DashboardCreationOptions
) {
  /**
   * Create an observable stream that checks for unsaved changes in the Dashboard state
   * and the state of all of its legacy embeddable children.
   */
  const dashboardUnsavedChanges = this.anyReducerRun.pipe(
    startWith(null),
    debounceTime(CHANGE_CHECK_DEBOUNCE),
    switchMap(() => {
      return (async () => {
        const {
          explicitInput: currentInput,
          componentState: { lastSavedInput },
        } = this.getState();
        const unsavedChanges = await getDashboardUnsavedChanges.bind(this)(
          lastSavedInput,
          currentInput
        );
        return unsavedChanges;
      })();
    })
  );

  /**
   * Combine unsaved changes from all sources together. Set unsaved changes state and backup unsaved changes when any of the sources emit.
   */
  this.diffingSubscription.add(
    combineLatest([
      dashboardUnsavedChanges,
      childrenUnsavedChanges$(this.children$),
      this.controlGroupApi$.pipe(
        skipWhile((controlGroupApi) => !controlGroupApi),
        switchMap((controlGroupApi) => {
          return controlGroupApi!.unsavedChanges;
        })
      ),
    ]).subscribe(([dashboardChanges, unsavedPanelState, controlGroupChanges]) => {
      // calculate unsaved changes
      const hasUnsavedChanges =
        Object.keys(omit(dashboardChanges, keysNotConsideredUnsavedChanges)).length > 0 ||
        unsavedPanelState !== undefined ||
        controlGroupChanges !== undefined;
      if (hasUnsavedChanges !== this.getState().componentState.hasUnsavedChanges) {
        this.dispatch.setHasUnsavedChanges(hasUnsavedChanges);
      }

      // backup unsaved changes if configured to do so
      if (creationOptions?.useSessionStorageIntegration) {
        const reactEmbeddableChanges = unsavedPanelState ? { ...unsavedPanelState } : {};
        if (controlGroupChanges) {
          reactEmbeddableChanges[PANELS_CONTROL_GROUP_KEY] = controlGroupChanges;
        }
        backupUnsavedChanges.bind(this)(dashboardChanges, reactEmbeddableChanges);
      }
    })
  );
}

/**
 * Does a shallow diff between @param lastInput and @param input and
 * @returns an object out of the keys which are different.
 */
export async function getDashboardUnsavedChanges(
  this: DashboardContainer,
  lastInput: DashboardContainerInput,
  input: DashboardContainerInput
): Promise<Partial<DashboardContainerInput>> {
  const allKeys = [...new Set([...Object.keys(lastInput), ...Object.keys(input)])] as Array<
    keyof DashboardContainerInput
  >;
  const keyComparePromises = allKeys.map(
    (key) =>
      new Promise<{ key: keyof DashboardContainerInput; isEqual: boolean }>((resolve) => {
        if (input[key] === undefined && lastInput[key] === undefined) {
          resolve({ key, isEqual: true });
        }
        isKeyEqualAsync(
          key,
          {
            container: this,

            currentValue: input[key],
            currentInput: input,

            lastValue: lastInput[key],
            lastInput,
          },
          unsavedChangesDiffingFunctions
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

function backupUnsavedChanges(
  this: DashboardContainer,
  dashboardChanges: Partial<DashboardContainerInput>,
  reactEmbeddableChanges: UnsavedPanelState
) {
  const { dashboardBackup } = pluginServices.getServices();
  const dashboardStateToBackup = omit(dashboardChanges, keysToOmitFromSessionStorage);

  dashboardBackup.setState(
    this.getDashboardSavedObjectId(),
    {
      ...dashboardStateToBackup,
      panels: dashboardChanges.panels,
    },
    reactEmbeddableChanges
  );
}
