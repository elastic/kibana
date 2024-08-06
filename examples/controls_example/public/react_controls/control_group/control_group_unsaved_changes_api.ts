/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import {
  childrenUnsavedChanges$,
  initializeUnsavedChanges,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  apiPublishesUnsavedChanges,
  PublishesUnsavedChanges,
  StateComparators,
} from '@kbn/presentation-publishing';
import { combineLatest, map } from 'rxjs';
import { ControlsInOrder, getControlsInOrder } from './init_controls_manager';
import { ControlGroupRuntimeState, ControlPanelsState } from './types';

export type ControlGroupComparatorState = Pick<
  ControlGroupRuntimeState,
  | 'autoApplySelections'
  | 'chainingSystem'
  | 'ignoreParentSettings'
  | 'initialChildControlState'
  | 'labelPosition'
> & {
  controlsInOrder: ControlsInOrder;
};

export function initializeControlGroupUnsavedChanges(
  children$: PresentationContainer['children$'],
  comparators: StateComparators<ControlGroupComparatorState>,
  snapshotControlsRuntimeState: () => ControlPanelsState,
  parentApi: unknown,
  lastSavedRuntimeState: ControlGroupRuntimeState
) {
  const controlGroupUnsavedChanges = initializeUnsavedChanges<ControlGroupComparatorState>(
    {
      autoApplySelections: lastSavedRuntimeState.autoApplySelections,
      chainingSystem: lastSavedRuntimeState.chainingSystem,
      controlsInOrder: getControlsInOrder(lastSavedRuntimeState.initialChildControlState),
      ignoreParentSettings: lastSavedRuntimeState.ignoreParentSettings,
      initialChildControlState: lastSavedRuntimeState.initialChildControlState,
      labelPosition: lastSavedRuntimeState.labelPosition,
    },
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
