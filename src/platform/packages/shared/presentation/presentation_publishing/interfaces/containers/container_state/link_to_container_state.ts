/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatestWith, debounceTime, map, of } from 'rxjs';
import { type StateComparators, areComparatorsEqual } from '../../../state_manager';
import type { StateManager } from '../../../state_manager/types';
import type { HasParentApi } from '../../has_parent_api';
import type { HasSerializableState } from '../../has_serializable_state';
import type { HasUniqueId } from '../../has_uuid';
import type { PublishesUnsavedChanges } from '../../publishes_unsaved_changes';
import { getTitle } from '../../titles/publishes_title';
import { apiHasLastSavedChildState } from '../last_saved_child_state';
import type { PresentationContainer } from '../presentation_container';

const UNSAVED_CHANGES_DEBOUNCE = 100;

export interface ContainerStateManagerInitializer<StateType extends object>
  extends HasSerializableState<StateType> {
  defaultState?: Partial<StateType>;
  anyStateChange$: StateManager<StateType>['anyStateChange$'];
  getComparators: () => StateComparators<StateType>;
}

export const linkToContainerState = <StateType extends object = object>({
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
