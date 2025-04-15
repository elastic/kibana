/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, map, of } from 'rxjs';

import {
  apiHasLastSavedChildState,
  childrenUnsavedChanges$,
  initializeUnsavedChanges,
  type PresentationContainer,
} from '@kbn/presentation-containers';
import { apiPublishesUnsavedChanges, SerializedPanelState } from '@kbn/presentation-publishing';

import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import {
  DEFAULT_CONTROL_CHAINING,
  type ControlGroupRuntimeState,
  type ControlGroupSerializedState,
  type ControlPanelsState,
} from '../../common';
import { apiPublishesAsyncFilters } from '../controls/data_controls/publishes_async_filters';
import type { ControlsInOrder } from './init_controls_manager';
import { deserializeControlGroup } from './utils/serialization_utils';
import { ControlGroupEditorState } from './types';

export type ControlGroupComparatorState = Pick<
  ControlGroupRuntimeState,
  'autoApplySelections' | 'chainingSystem' | 'ignoreParentSettings' | 'labelPosition'
> & {
  controlsInOrder: ControlsInOrder;
};

export function initializeControlGroupUnsavedChanges({
  applySelections,
  children$,
  controlGroupId,
  controlGroupStateManager,
  parentApi,
  resetControlsUnsavedChanges,
  serializeControlGroupState,
}: {
  applySelections: () => void;
  children$: PresentationContainer['children$'];
  controlGroupId: string;
  controlGroupStateManager: StateManager<ControlGroupEditorState>;
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
      ? deserializeControlGroup(serializeControlGroupState()).initialChildControlState
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
    anyStateChange$: controlGroupStateManager.anyStateChange$,
    getComparators: () => {
      return {
        autoApplySelections: 'referenceEquality',
        chainingSystem: (a, b) =>
          (a ?? DEFAULT_CONTROL_CHAINING) === (b ?? DEFAULT_CONTROL_CHAINING),
        ignoreParentSettings: 'deepEquality',
        labelPosition: 'referenceEquality',
      };
    },
    onReset: (lastSaved) => {
      controlGroupStateManager.reinitializeState(lastSaved?.rawState);
    },
  });

  return {
    api: {
      lastSavedStateForChild$: (controlId: string) =>
        lastSavedControlsState$.pipe(map(() => getLastSavedStateForControl(controlId))),
      getLastSavedStateForChild: getLastSavedStateForControl,
      hasUnsavedChanges$: combineLatest([
        controlGroupEditorUnsavedChangesApi.hasUnsavedChanges$,
        childrenUnsavedChanges$(children$),
      ]).pipe(
        map(([hasUnsavedControlGroupChanges, unsavedControlsState]) => {
          return hasUnsavedControlGroupChanges || unsavedControlsState !== undefined;
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

        if (!controlGroupStateManager.api.autoApplySelections$.value) {
          applySelections();
        }
      },
    },
  };
}
