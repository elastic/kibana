/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { AnyAction, Middleware } from 'redux';
import { debounceTime, Observable, startWith, Subject, switchMap } from 'rxjs';
import { ControlGroupContainer, ControlGroupInput } from '..';

import { controlGroupReducers } from './control_group_reducers';

/**
 * An array of reducers which cannot cause unsaved changes. Unsaved changes only compares the explicit input
 * and the last saved input, so we can safely ignore any output reducers, and most componentState reducers.
 * This is only for performance reasons, because the diffing function itself can be quite heavy.
 */
export const reducersToIgnore: Array<keyof typeof controlGroupReducers> = [
  'setDefaultControlWidth',
  'setDefaultControlGrow',
];

/**
 * Does an initial diff between @param initialInput and @param initialLastSavedInput, and created a middleware
 * which listens to the redux store and checks for & publishes the unsaved changes on dispatches.
 */
export function startDiffingControlGroupState(this: ControlGroupContainer) {
  const checkForUnsavedChangesSubject$ = new Subject<null>();
  this.diffingSubscription.add(
    checkForUnsavedChangesSubject$
      .pipe(
        startWith(null),
        debounceTime(100), // TODO: constant
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

                // updateUnsavedChangesState.bind(this)(unsavedChanges);
                const hasChanges = Object.keys(unsavedChanges).length > 0;
                this.hasUnsavedChanges.next(hasChanges);
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
  this: ControlGroupContainer,
  lastInput: ControlGroupInput,
  input: ControlGroupInput
): Promise<Partial<ControlGroupInput>> {
  const allKeys = [...new Set([...Object.keys(lastInput), ...Object.keys(input)])] as Array<
    keyof ControlGroupInput
  >;

  const unsavedChanges = allKeys.reduce((diff, key) => {
    if (fastIsEqual(lastInput[key], input[key])) return diff;
    return {
      ...diff,
      [key]: input[key],
    };
  }, {});
  return unsavedChanges;
  // const keyComsparePromises = allKeys.map(
  //   (key) =>
  //     new Promise<{ key: keyof ControlGroupInput; isEqual: boolean }>((resolve) => {
  //       if (input[key] === undefined && lastInput[key] === undefined) {
  //         resolve({ key, isEqual: true });
  //       }

  //       isKeyEqualAsync(
  //         key,
  //         {
  //           container: this,

  //           currentValue: input[key],
  //           currentInput: input,

  //           lastValue: lastInput[key],
  //           lastInput,
  //         },
  //         unsavedChangesDiffingFunctions
  //       ).then((isEqual) => resolve({ key, isEqual }));
  //     })
  // );
  // const inputChanges = (await Promise.allSettled(keyComparePromises)).reduce((changes, current) => {
  //   if (current.status === 'fulfilled') {
  //     const { key, isEqual } = current.value;
  //     if (!isEqual) (changes as { [key: string]: unknown })[key] = input[key];
  //   }
  //   return changes;
  // }, {} as Partial<DashboardContainerInput>);
  // return inputChanges;
}

// export function getShouldRefresh(
//   this: DashboardContainer,
//   lastInput: DashboardContainerInput,
//   input: DashboardContainerInput
// ): boolean {
//   for (const key of sessionChangeKeys) {
//     if (input[key] === undefined && lastInput[key] === undefined) {
//       continue;
//     }
//     if (
//       !isKeyEqual(
//         key,
//         {
//           container: this,
//           currentValue: input[key],
//           currentInput: input,
//           lastValue: lastInput[key],
//           lastInput,
//         },
//         shouldRefreshDiffingFunctions
//       )
//     ) {
//       return true;
//     }
//   }
//   return false;
// }

// function updateUnsavedChangesState(
//   this: ControlGroupContainer,
//   unsavedChanges: Partial<ControlGroupInput>
// ) {
//   // dispatch has unsaved changes state
//   const hasChanges = Object.keys(unsavedChanges).length > 0;
//   if (this.getState().componentState.hasUnsavedChanges !== hasChanges) {
//     this.dispatch.setHasUnsavedChanges(hasChanges);
//   }
// }

// function backupUnsavedChanges(
//   this: DashboardContainer,
//   unsavedChanges: Partial<DashboardContainerInput>
// ) {
//   const { dashboardBackup } = pluginServices.getServices();
//   dashboardBackup.setState(
//     this.getDashboardSavedObjectId(),
//     omit(unsavedChanges, keysToOmitFromSessionStorage)
//   );
// }
