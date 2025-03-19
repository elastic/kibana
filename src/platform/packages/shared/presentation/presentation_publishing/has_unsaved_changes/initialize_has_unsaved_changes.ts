/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiHasLastSavedChildState,
  type HasLastSavedChildState,
} from '@kbn/presentation-containers';
import { MaybePromise } from '@kbn/utility-types';
import deepEqual from 'fast-deep-equal';
import { BehaviorSubject, combineLatestWith, debounceTime, Subscription } from 'rxjs';
import {
  apiHasSerializableState,
  apiHasSerializedStateComparator,
  HasSnapshottableState,
  latestComparatorValues$,
  PublishesUnsavedChanges,
  SerializedPanelState,
  StateComparators,
} from '..';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

const serializedStateComparator = <SerializedState extends object = object>(
  api: unknown,
  a?: SerializedState,
  b?: SerializedState
) => {
  if (Boolean(a) !== Boolean(b)) return false;

  // clone via serialization to deeply remove undefined values
  const stateA = JSON.parse(JSON.stringify(a ?? {})) as SerializedState;
  const stateB = JSON.parse(JSON.stringify(b ?? {})) as SerializedState;

  const comparatorFunction = apiHasSerializedStateComparator<SerializedState>(api)
    ? api.isSerializedStateEqual
    : deepEqual;
  const isEqual = comparatorFunction(stateA, stateB);

  console.log('has changes', !isEqual);
  return isEqual;
  // console.log('CHECKING', stateA, stateB, 'for panel', (api as any).uuid, isEqual);
};

export const initializeHasUnsavedChanges = <
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState
>(
  uuid: string,
  comparators: StateComparators<RuntimeState>,
  api: unknown,
  parentApi: unknown,
  deserializeState: (state: SerializedPanelState<SerializedState>) => MaybePromise<RuntimeState>
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
    !parentApi ||
    !apiHasLastSavedChildState<SerializedState>(parentApi) ||
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
    return (parentApi as HasLastSavedChildState<SerializedState>).getLastSavedStateForChild(uuid);
  };
  const lastSavedState$ = new BehaviorSubject<SerializedPanelState<SerializedState> | undefined>(
    getLastSavedState()
  );
  subscriptions.push(
    // any time the parent saves, refresh the last saved state...
    parentApi.saveNotification$.subscribe(() => {
      lastSavedState$.next(getLastSavedState());
    })
  );

  /**
   * set up hasUnsavedChanges$. It should recalculate whether this API has unsaved changes any time the
   * last saved state or the runtime state changes.
   */
  const compareState = () =>
    serializedStateComparator(
      api,
      lastSavedState$.getValue()?.rawState,
      api.serializeState().rawState
    );
  const hasUnsavedChanges$ = new BehaviorSubject<boolean>(!compareState());
  subscriptions.push(
    latestComparatorValues$(comparators)
      .pipe(debounceTime(COMPARATOR_SUBJECTS_DEBOUNCE), combineLatestWith(lastSavedState$))
      .subscribe(() => hasUnsavedChanges$.next(!compareState()))
  );

  return {
    api: {
      hasUnsavedChanges$,
      resetUnsavedChanges: () => {
        const lastSavedState = lastSavedState$.getValue();
        if (!lastSavedState) return; // early return because if the parent does not have last saved state for this panel it will be removed.
        (async () => {
          const resetRuntimeState = await deserializeState(lastSavedState);
          for (const key of Object.keys(comparators) as Array<keyof RuntimeState>) {
            comparators[key][1](resetRuntimeState[key]);
          }
        })();
      },
      snapshotRuntimeState,
    } as PublishesUnsavedChanges & HasSnapshottableState<RuntimeState>,
    cleanup: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  };
};
