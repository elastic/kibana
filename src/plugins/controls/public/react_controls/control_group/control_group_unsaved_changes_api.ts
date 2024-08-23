/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  initializeUnsavedChanges,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  apiPublishesUnsavedChanges,
  PublishesUnsavedChanges,
  StateComparators,
} from '@kbn/presentation-publishing';
import { ControlGroupRuntimeState } from './types';
import { apiPublishesAsyncFilters } from '../controls/data_controls/publishes_async_filters';

export type ControlGroupComparatorState = Pick<
  ControlGroupRuntimeState,
  | 'autoApplySelections'
  | 'chainingSystem'
  | 'ignoreParentSettings'
  | 'initialChildControlState'
  | 'labelPosition'
>;

export function initializeControlGroupUnsavedChanges(
  applySelections: () => void,
  children$: PresentationContainer['children$'],
  comparators: StateComparators<ControlGroupComparatorState>,
  parentApi: unknown,
  lastSavedRuntimeState: ControlGroupRuntimeState
) {
  const controlGroupUnsavedChanges = initializeUnsavedChanges<ControlGroupComparatorState>(
    {
      autoApplySelections: lastSavedRuntimeState.autoApplySelections,
      chainingSystem: lastSavedRuntimeState.chainingSystem,
      ignoreParentSettings: lastSavedRuntimeState.ignoreParentSettings,
      initialChildControlState: lastSavedRuntimeState.initialChildControlState,
      labelPosition: lastSavedRuntimeState.labelPosition,
    },
    parentApi,
    comparators
  );

  return {
    api: {
      unsavedChanges: controlGroupUnsavedChanges.api.unsavedChanges,
      asyncResetUnsavedChanges: async () => {
        controlGroupUnsavedChanges.api.resetUnsavedChanges();

        const filtersReadyPromises: Array<Promise<void>> = [];
        Object.values(children$.value).forEach((controlApi) => {
          if (apiPublishesUnsavedChanges(controlApi)) controlApi.resetUnsavedChanges();
          if (apiPublishesAsyncFilters(controlApi)) {
            filtersReadyPromises.push(controlApi.untilFiltersReady());
          }
        });

        await Promise.all(filtersReadyPromises);

        if (!comparators.autoApplySelections[0].value) {
          applySelections();
        }
      },
    } as Pick<PublishesUnsavedChanges, 'unsavedChanges'> & {
      asyncResetUnsavedChanges: () => Promise<void>;
    },
  };
}
