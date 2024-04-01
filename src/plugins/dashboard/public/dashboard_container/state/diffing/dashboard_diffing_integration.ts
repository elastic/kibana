/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { apiPublishesUnsavedChanges, PublishesUnsavedChanges } from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { cloneDeep, omit } from 'lodash';
import { AnyAction, Middleware } from 'redux';
import { combineLatest, debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DashboardContainer, DashboardCreationOptions } from '../..';
import { DashboardContainerInput } from '../../../../common';
import { CHANGE_CHECK_DEBOUNCE } from '../../../dashboard_constants';
import { pluginServices } from '../../../services/plugin_services';
import { dashboardContainerReducers } from '../dashboard_container_reducers';
import {
  isKeyEqual,
  isKeyEqualAsync,
  shouldRefreshDiffingFunctions,
  unsavedChangesDiffingFunctions,
} from './dashboard_diffing_functions';

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
 * input keys that will cause a new session to be created.
 */
const sessionChangeKeys: Array<keyof Omit<DashboardContainerInput, 'panels'>> = [
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
   *  Create an observable stream of unsaved changes from all react embeddable children
   */
  const reactEmbeddableUnsavedChanges = this.children$.pipe(
    map((children) => Object.keys(children)),
    distinctUntilChanged(deepEqual),
    debounceTime(CHANGE_CHECK_DEBOUNCE),

    // children may change, so make sure we subscribe/unsubscribe with switchMap
    switchMap((newChildIds: string[]) => {
      if (newChildIds.length === 0) return of([]);
      const childrenThatPublishUnsavedChanges = Object.entries(this.children$.value).filter(
        (child) => apiPublishesUnsavedChanges(child)
      ) as Array<[string, PublishesUnsavedChanges]>;

      return combineLatest(
        childrenThatPublishUnsavedChanges.map(([childId, child]) =>
          child.unsavedChanges.pipe(
            map((unsavedChanges) => {
              return { childId, unsavedChanges };
            })
          )
        )
      );
    }),
    map((children) => children.filter((child) => Boolean(child.unsavedChanges)))
  );

  /**
   * Create an observable stream that checks for unsaved changes in the Dashboard state
   * and the state of all of its legacy embeddable children.
   */
  const dashboardUnsavedChanges = this.anyReducerRun.pipe(
    startWith(null),
    debounceTime(CHANGE_CHECK_DEBOUNCE),
    switchMap(() => {
      return new Observable<Partial<DashboardContainerInput>>((observer) => {
        const {
          explicitInput: currentInput,
          componentState: { lastSavedInput },
        } = this.getState();
        getDashboardUnsavedChanges
          .bind(this)(lastSavedInput, currentInput)
          .then((unsavedChanges) => {
            if (observer.closed) return;
            observer.next(unsavedChanges);
          });
      });
    })
  );

  /**
   * Combine unsaved changes from all sources together. Set unsaved changes state and backup unsaved changes when any of the sources emit.
   */
  this.diffingSubscription.add(
    combineLatest([
      dashboardUnsavedChanges,
      reactEmbeddableUnsavedChanges,
      this.controlGroup?.unsavedChanges ??
        (of(undefined) as Observable<PersistableControlGroupInput | undefined>),
    ]).subscribe(([dashboardChanges, reactEmbeddableChanges, controlGroupChanges]) => {
      // calculate unsaved changes
      const hasUnsavedChanges =
        Object.keys(omit(dashboardChanges, keysNotConsideredUnsavedChanges)).length > 0 ||
        reactEmbeddableChanges.length > 0 ||
        controlGroupChanges !== undefined;
      if (hasUnsavedChanges !== this.getState().componentState.hasUnsavedChanges) {
        this.dispatch.setHasUnsavedChanges(hasUnsavedChanges);
      }

      // backup unsaved changes if configured to do so
      if (creationOptions?.useSessionStorageIntegration) {
        backupUnsavedChanges.bind(this)(
          dashboardChanges,
          reactEmbeddableChanges,
          controlGroupChanges
        );
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

export function getShouldRefresh(
  this: DashboardContainer,
  lastInput: DashboardContainerInput,
  input: DashboardContainerInput
): boolean {
  for (const key of sessionChangeKeys) {
    if (input[key] === undefined && lastInput[key] === undefined) {
      continue;
    }
    if (
      !isKeyEqual(
        key,
        {
          container: this,
          currentValue: input[key],
          currentInput: input,
          lastValue: lastInput[key],
          lastInput,
        },
        shouldRefreshDiffingFunctions
      )
    ) {
      return true;
    }
  }
  return false;
}

function backupUnsavedChanges(
  this: DashboardContainer,
  dashboardChanges: Partial<DashboardContainerInput>,
  reactEmbeddableChanges: Array<{
    childId: string;
    unsavedChanges: object | undefined;
  }>,
  controlGroupChanges: PersistableControlGroupInput | undefined
) {
  const { dashboardBackup } = pluginServices.getServices();

  // apply all unsaved state from react embeddables to the unsaved changes object.
  let hasAnyReactEmbeddableUnsavedChanges = false;
  const currentPanels = cloneDeep(dashboardChanges.panels ?? this.getInput().panels);
  for (const { childId, unsavedChanges: childUnsavedChanges } of reactEmbeddableChanges) {
    if (!childUnsavedChanges) continue;
    const panelStateToBackup = {
      ...currentPanels[childId],
      ...(dashboardChanges.panels?.[childId] ?? {}),
      explicitInput: {
        ...currentPanels[childId]?.explicitInput,
        ...(dashboardChanges.panels?.[childId]?.explicitInput ?? {}),
        ...childUnsavedChanges,
      },
    };
    hasAnyReactEmbeddableUnsavedChanges = true;
    currentPanels[childId] = panelStateToBackup;
  }
  const dashboardStateToBackup = omit(dashboardChanges, keysToOmitFromSessionStorage);

  dashboardBackup.setState(this.getDashboardSavedObjectId(), {
    ...dashboardStateToBackup,
    panels: hasAnyReactEmbeddableUnsavedChanges ? currentPanels : dashboardChanges.panels,
    controlGroupInput: controlGroupChanges,
  });
}
