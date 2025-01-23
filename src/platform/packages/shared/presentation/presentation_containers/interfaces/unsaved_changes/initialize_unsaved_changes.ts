/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiHasParentApi,
  apiHasSerializableState,
  apiHasSerializedStateComparator,
  HasSnapshottableState,
  PublishesUnsavedChanges,
  PublishingSubject,
  SerializedPanelState,
  StateComparators,
} from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  Subscription,
} from 'rxjs';
import { apiHasLastSavedChildState, HasLastSavedChildState } from '../child_state';
import { apiIsPresentationContainer } from '../presentation_container';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

export const initializeUnsavedChanges = <
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState,
  Api extends unknown = unknown
>(
  uuid: string,
  type: string,
  comparators: StateComparators<RuntimeState>,
  api: Api
) => {
  const snapshotRuntimeState = () => {
    const comparatorKeys = Object.keys(comparators) as Array<keyof RuntimeState>;
    const snapshot = {} as RuntimeState;
    comparatorKeys.forEach((key) => {
      const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
      snapshot[key] = comparatorSubject.value as RuntimeState[typeof key];
    });
    return snapshot;
  };

  if (
    !apiHasParentApi(api) ||
    !apiHasLastSavedChildState<SerializedState>(api.parentApi) ||
    !apiHasSerializableState<SerializedState>(api)
  ) {
    return {
      api: {
        hasUnsavedChanges$: new BehaviorSubject<boolean>(false),
        resetUnsavedChanges: () => {},
        snapshotRuntimeState,
      } as PublishesUnsavedChanges & HasSnapshottableState<RuntimeState>,
      cleanup: () => {},
    };
  }
  const subscriptions: Subscription[] = [];

  /**
   * Set up a subject that refreshes the last saved state from the parent any time
   * the parent saves.
   */
  const getLastSavedState = () => {
    return (api.parentApi as HasLastSavedChildState<SerializedState>).getLastSavedStateForChild(
      uuid
    );
  };
  const lastSavedState$ = new BehaviorSubject<SerializedPanelState<SerializedState> | undefined>(
    getLastSavedState()
  );
  subscriptions.push(
    // any time the parent saves, refresh the last saved state...
    api.parentApi.saveNotification$.subscribe(() => {
      lastSavedState$.next(getLastSavedState());
    })
  );

  /**
   * set up hasUnsavedChanges$. It should recalculate whether this API has unsaved changes any time the
   * last saved state or the runtime state changes.
   */
  const comparatorFunction = apiHasSerializedStateComparator<SerializedState>(api)
    ? api.isSerializedStateEqual
    : deepEqual;
  const compareState = () => comparatorFunction(lastSavedState$.getValue(), api.serializeState());
  const hasUnsavedChanges$ = new BehaviorSubject<boolean>(!compareState());
  const comparatorSubjects$: Array<PublishingSubject<unknown>> = Object.values(comparators);
  subscriptions.push(
    combineLatest(comparatorSubjects$)
      .pipe(debounceTime(COMPARATOR_SUBJECTS_DEBOUNCE), combineLatestWith(lastSavedState$))
      .subscribe(() => hasUnsavedChanges$.next(!compareState()))
  );

  return {
    api: {
      hasUnsavedChanges$,
      resetUnsavedChanges: () => {
        if (!apiIsPresentationContainer(api.parentApi)) return;
        api.parentApi.replacePanel(uuid, {
          panelType: type,
          serializedState: lastSavedState$.getValue(),
        });
      },
      snapshotRuntimeState,
    } as PublishesUnsavedChanges & HasSnapshottableState<RuntimeState>,
    cleanup: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  };
};
