/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import {
  apiHasSerializedChildState,
  childrenUnsavedChanges$,
  initializeUnsavedChanges,
  PresentationContainer,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import {
  apiPublishesUnsavedChanges,
  PublishesUnsavedChanges,
  StateComparators,
} from '@kbn/presentation-publishing';
import { combineLatest, map } from 'rxjs';
import { ControlsInOrder, getControlsInOrder } from './init_controls_manager';
import { ControlGroupRuntimeState, ControlGroupSerializedState, ControlPanelsState } from './types';
import { deserializeControlGroup } from './serialization_utils';

type ControlGroupComparatorState = Pick<
  ControlGroupRuntimeState,
  'autoApplySelections' | 'chainingSystem' | 'ignoreParentSettings' | 'labelPosition'
> & {
  controlsInOrder: ControlsInOrder;
};

export function initializeControlGroupUnsavedChanges(
  children$: PresentationContainer['children$'],
  comparators: StateComparators<ControlGroupComparatorState>,
  snapshotControlsRuntimeState: () => ControlPanelsState,
  parentApi: unknown,
  uuid: string,
) {
  const lastSavedState = getLastSavedState(comparators, parentApi, uuid);
  const controlGroupUnsavedChanges = initializeUnsavedChanges<ControlGroupComparatorState>(
    lastSavedState,
    parentApi,
    comparators
  );

  return {
    api: {
      unsavedChanges: combineLatest([
        controlGroupUnsavedChanges.api.unsavedChanges,
        childrenUnsavedChanges$(children$),
      ]).pipe(
        map(([unsavedControlGroupState, unsavedControlsState]) => {
          const unsavedChanges: Partial<ControlGroupRuntimeState> = unsavedControlGroupState
            ? omit(unsavedControlGroupState, 'controlsInOrder')
            : {};
          if (unsavedControlsState || unsavedControlGroupState?.controlsInOrder) {
            unsavedChanges.initialChildControlState = snapshotControlsRuntimeState();
          }
          return Object.keys(unsavedChanges).length ? unsavedChanges : undefined;
        })
      ),
      resetUnsavedChanges: () => {
        controlGroupUnsavedChanges.api.resetUnsavedChanges();
        Object.values(children$.value).forEach((controlApi) => {
          if (apiPublishesUnsavedChanges(controlApi)) controlApi.resetUnsavedChanges();
        });
      },
    } as PublishesUnsavedChanges<ControlGroupRuntimeState>,
  };
}

function getLastSavedState(
  comparators: StateComparators<ControlGroupComparatorState>,
  parentApi: unknown,
  uuid: string,
): ControlGroupComparatorState {
  if (!apiHasSerializedChildState(parentApi)) {
    return {
      autoApplySelections: comparators.autoApplySelections[0].value,
      chainingSystem: comparators.chainingSystem[0].value,
      controlsInOrder: comparators.controlsInOrder[0].value,
      ignoreParentSettings: comparators.ignoreParentSettings[0].value,
      labelPosition: comparators.labelPosition[0].value,
    };
  }

  const lastSerializedState = parentApi.getSerializedStateForChild(uuid) as SerializedPanelState<ControlGroupSerializedState>;
  const lastRuntimeState = deserializeControlGroup(lastSerializedState);
  return {
    autoApplySelections: lastRuntimeState.autoApplySelections,
    chainingSystem: lastRuntimeState.chainingSystem,
    controlsInOrder: getControlsInOrder(lastRuntimeState.initialChildControlState),
    ignoreParentSettings: lastRuntimeState.ignoreParentSettings,
    labelPosition: lastRuntimeState.labelPosition,
  };
}
