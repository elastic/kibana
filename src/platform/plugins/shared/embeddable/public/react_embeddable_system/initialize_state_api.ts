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
  areComparatorsEqual,
  getTitle,
  type HasParentApi,
  type HasSerializableState,
  type HasUniqueId,
  type PresentationContainer,
  type PublishesUnsavedChanges,
  type StateComparators,
  type StateManager,
} from '@kbn/presentation-publishing';
import { combineLatestWith, debounceTime, map, of } from 'rxjs';

const UNSAVED_CHANGES_DEBOUNCE = 100;

export interface ContainerStateManagerInitializer<StateType extends object>
  extends HasSerializableState<StateType> {
  defaultState?: Partial<StateType>;
  anyStateChange$: StateManager<StateType>['anyStateChange$'];
  getComparators: () => StateComparators<StateType>;
}

export const initializeStateApi = <StateType extends object = object>({
  uuid,
  parentApi,
  defaultState,
  anyStateChange$,
  serializeState,
  getComparators,
  applySerializedState,
}: HasSerializableState<StateType> &
  HasUniqueId &
  HasParentApi &
  ContainerStateManagerInitializer<StateType>): PublishesUnsavedChanges &
  HasSerializableState<StateType> => {
  if (!apiHasLastSavedChildState<StateType>(parentApi)) {
    return {
      serializeState,
      applySerializedState,
      hasUnsavedChanges$: of(false),
    };
  }

  const hasUnsavedChanges$ = anyStateChange$.pipe(
    combineLatestWith(parentApi.lastSavedStateForChild$(uuid)),
    debounceTime(UNSAVED_CHANGES_DEBOUNCE),
    map(([, lastSavedState]) => {
      const currentState = serializeState();

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
    serializeState,
    hasUnsavedChanges$,
    applySerializedState,
  };
};
