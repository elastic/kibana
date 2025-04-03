/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PublishesUnsavedChanges,
  StateComparators,
  areComparatorsEqual,
} from '@kbn/presentation-publishing';
import { MaybePromise } from '@kbn/utility-types';
import { Observable, combineLatestWith, debounceTime, map, of } from 'rxjs';
import { apiHasLastSavedChildState } from '../last_saved_child_state';

const UNSAVED_CHANGES_DEBOUNCE = 100;

export const initializeUnsavedChanges = <SerializedStateType extends object = object>({
  uuid,
  onReset,
  parentApi,
  getComparators,
  serializeState,
  latestRuntimeState$,
}: {
  uuid: string;
  parentApi: unknown;
  latestRuntimeState$: Observable<unknown>;
  serializeState: () => SerializedStateType;
  getComparators: () => StateComparators<SerializedStateType>;
  onReset: (newState?: SerializedStateType) => MaybePromise<void>;
}): PublishesUnsavedChanges => {
  if (!apiHasLastSavedChildState<SerializedStateType>(parentApi)) {
    return {
      hasUnsavedChanges$: of(false),
      resetUnsavedChanges: () => Promise.resolve(),
    };
  }
  const hasUnsavedChanges$ = latestRuntimeState$.pipe(
    // Ignore the latest runtime state and compare with serialized state instead.
    map(() => serializeState()),
    combineLatestWith(
      parentApi.lastSavedStateForChild$(uuid).pipe(map((panelState) => panelState?.rawState))
    ),
    debounceTime(UNSAVED_CHANGES_DEBOUNCE),
    map(([latestState, lastSavedState]) => {
      return !areComparatorsEqual(getComparators(), lastSavedState, latestState);
    })
  );

  const resetUnsavedChanges = async () => {
    const lastSavedState = parentApi.getLastSavedStateForChild(uuid);
    await onReset(lastSavedState?.rawState);
  };

  return { hasUnsavedChanges$, resetUnsavedChanges };
};
