/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { AnyAction, Middleware } from 'redux';
import { debounceTime, Observable, startWith, Subject, switchMap } from 'rxjs';

import { compareFilters, COMPARE_ALL_OPTIONS } from '@kbn/es-query';
import { ControlGroupContainer } from '..';
import { persistableControlGroupInputIsEqual } from '../../../common';
import { CHANGE_CHECK_DEBOUNCE } from '../../constants';
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
        debounceTime(CHANGE_CHECK_DEBOUNCE),
        switchMap(() => {
          return new Observable((observer) => {
            if (observer.closed) return;

            const {
              explicitInput: currentInput,
              componentState: { lastSavedInput, lastSavedFilters },
              output: { filters, timeslice },
            } = this.getState();

            const hasUnsavedChanges = !(
              persistableControlGroupInputIsEqual(
                currentInput,
                lastSavedInput,
                false // never diff selections for unsaved changes - compare the output filters instead
              )
              // compareFilters(filters ?? [], lastSavedFilters?.filters ?? [], COMPARE_ALL_OPTIONS) &&
              // isEqual(timeslice, lastSavedFilters?.timeslice)
            );

            this.unsavedChanges.next(hasUnsavedChanges ? this.getPersistableInput() : undefined);
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
