/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import { combineLatest, combineLatestWith, debounceTime, map, merge, of } from 'rxjs';

import {
  apiHasLastSavedChildState,
  childrenUnsavedChanges$,
  initializeUnsavedChanges,
  type PresentationContainer,
} from '@kbn/presentation-containers';
import {
  apiPublishesUnsavedChanges,
  PublishingSubject,
  SerializedPanelState,
} from '@kbn/presentation-publishing';

import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import type { ControlGroupSerializedState, ControlPanelsState } from '../../common';
import { apiPublishesAsyncFilters } from '../controls/data_controls/publishes_async_filters';
import { getControlsInOrder, type ControlsInOrder } from './init_controls_manager';
import { deserializeControlGroup } from './utils/serialization_utils';
import { ControlGroupEditorState } from './types';
import { defaultEditorState, editorStateComparators } from './initialize_editor_state_manager';

export function initializeControlGroupUnsavedChanges({
  applySelections,
  children$,
  controlGroupId,
  editorStateManager,
  layout$,
  parentApi,
  resetControlsUnsavedChanges,
  serializeControlGroupState,
}: {
  applySelections: () => void;
  children$: PresentationContainer['children$'];
  controlGroupId: string;
  editorStateManager: StateManager<ControlGroupEditorState>;
  layout$: PublishingSubject<ControlsInOrder>;
  parentApi: unknown;
  resetControlsUnsavedChanges: (lastSavedControlsState: ControlPanelsState) => void;
  serializeControlGroupState: () => SerializedPanelState<ControlGroupSerializedState>;
}) {
  function getLastSavedControlsState() {
    if (!apiHasLastSavedChildState<ControlGroupSerializedState>(parentApi)) {
      return {};
    }
    const lastSavedControlGroupState = parentApi.getLastSavedStateForChild(controlGroupId);
    return lastSavedControlGroupState
      ? deserializeControlGroup(lastSavedControlGroupState).initialChildControlState
      : {};
  }

  function getLastSavedStateForControl(controlId: string) {
    const controlState = getLastSavedControlsState()[controlId];
    return controlState ? { rawState: controlState } : undefined;
  }

  const lastSavedControlsState$ = apiHasLastSavedChildState<ControlGroupSerializedState>(parentApi)
    ? parentApi.lastSavedStateForChild$(controlGroupId).pipe(map(() => getLastSavedControlsState()))
    : of({});

  const controlGroupEditorUnsavedChangesApi = initializeUnsavedChanges<ControlGroupEditorState>({
    uuid: controlGroupId,
    parentApi,
    serializeState: serializeControlGroupState,
    anyStateChange$: merge(editorStateManager.anyStateChange$),
    getComparators: () => editorStateComparators,
    defaultState: defaultEditorState,
    onReset: (lastSaved) => {
      editorStateManager.reinitializeState(lastSaved?.rawState);
    },
  });

  const hasLayoutChanges$ = layout$.pipe(
    combineLatestWith(
      lastSavedControlsState$.pipe(map((controlsState) => getControlsInOrder(controlsState)))
    ),
    debounceTime(100),
    map(([, lastSavedLayout]) => {
      const currentLayout = layout$.value;
      return !fastIsEqual(currentLayout, lastSavedLayout);
    })
  );

  const hasControlChanges$ = childrenUnsavedChanges$(children$).pipe(
    map((childrenWithChanges) => {
      return childrenWithChanges.some(({ hasUnsavedChanges }) => hasUnsavedChanges);
    })
  );

  return {
    api: {
      lastSavedStateForChild$: (controlId: string) =>
        lastSavedControlsState$.pipe(map(() => getLastSavedStateForControl(controlId))),
      getLastSavedStateForChild: getLastSavedStateForControl,
      hasUnsavedChanges$: combineLatest([
        controlGroupEditorUnsavedChangesApi.hasUnsavedChanges$,
        hasControlChanges$,
        hasLayoutChanges$,
      ]).pipe(
        map(([hasUnsavedControlGroupChanges, hasControlChanges, hasLayoutChanges]) => {
          return hasUnsavedControlGroupChanges || hasControlChanges || hasLayoutChanges;
        })
      ),
      resetUnsavedChanges: async () => {
        controlGroupEditorUnsavedChangesApi.resetUnsavedChanges();
        resetControlsUnsavedChanges(getLastSavedControlsState());

        const filtersReadyPromises: Array<Promise<void>> = [];
        Object.values(children$.value).forEach((controlApi) => {
          if (apiPublishesUnsavedChanges(controlApi)) controlApi.resetUnsavedChanges();
          if (apiPublishesAsyncFilters(controlApi)) {
            filtersReadyPromises.push(controlApi.untilFiltersReady());
          }
        });

        await Promise.all(filtersReadyPromises);

        if (!editorStateManager.api.autoApplySelections$.value) {
          applySelections();
        }
      },
    },
  };
}
