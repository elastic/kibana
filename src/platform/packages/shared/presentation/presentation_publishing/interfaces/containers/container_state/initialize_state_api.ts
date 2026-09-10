/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatestWith, debounceTime, map, of, shareReplay, startWith } from 'rxjs';
import { type StateComparators, areComparatorsEqual } from '../../../state_manager';
import type { HasParentApi } from '../../has_parent_api';
import type { HasSerializableState } from '../../has_serializable_state';
import type { HasUniqueId } from '../../has_uuid';
import type { PublishesUnsavedChanges } from '../../publishes_unsaved_changes';
import { getTitle } from '../../titles/publishes_title';
import { apiHasLastSavedChildState } from '../last_saved_child_state';
import type { PresentationContainer } from '../presentation_container';
export const UNSAVED_CHANGES_DEBOUNCE = 100;

export const initializeStateApi = <StateType extends object = object>({
  uuid,
  applySerializedState,
  parentApi,
  getComparators,
  defaultState,
  serializeState,
  anyStateChange$,
}: Omit<HasSerializableState<StateType>, 'latestState$'> &
  HasUniqueId &
  HasParentApi & {
    getComparators: () => StateComparators<StateType>;
    defaultState?: Partial<StateType>;
  }): PublishesUnsavedChanges & HasSerializableState<StateType> => {
  const latestState$ = anyStateChange$.pipe(
    debounceTime(0), // combine all state changes
    // anyStateChange$ does not emit on subscribe
    // use startWith to get latest state on subscribe
    startWith(undefined),
    map(() => serializeState()),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  if (!apiHasLastSavedChildState<StateType>(parentApi)) {
    return {
      anyStateChange$,
      applySerializedState,
      hasUnsavedChanges$: of(false),
      serializeState,
      latestState$,
    };
  }

  const hasUnsavedChanges$ = latestState$.pipe(
    debounceTime(UNSAVED_CHANGES_DEBOUNCE),
    combineLatestWith(parentApi.lastSavedStateForChild$(uuid)),
    map(([currentState, lastSavedState]) => {
      // check state equality
      return !areComparatorsEqual(
        getComparators(),
        lastSavedState,
        currentState,
        defaultState,
        (key: string) => {
          const childApi = (parentApi as Partial<PresentationContainer>).children$?.getValue()[
            uuid
          ];
          const childlTitle = childApi ? getTitle(childApi) : undefined;
          const childLabel = childlTitle ? `"${childlTitle}"` : uuid;
          return `child: ${childLabel}, key: ${key}`;
        }
      );
    })
  );

  return {
    anyStateChange$,
    applySerializedState,
    hasUnsavedChanges$,
    latestState$,
    serializeState,
  };
};
