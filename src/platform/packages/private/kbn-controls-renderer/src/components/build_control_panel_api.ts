/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  type PublishesUnsavedChanges,
  apiPublishesUnsavedChanges,
} from '@kbn/presentation-publishing';
import type { StateComparators } from '@kbn/presentation-publishing/state_manager';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { pick } from 'lodash';
import { map, merge } from 'rxjs';

type ControlState = ControlsGroupState['controls'][number];
export type ControlPanelState = Pick<ControlState, 'width' | 'grow'> & { order: number };

export type ControlPanelApi = DefaultEmbeddableApi<ControlState> &
  StateManager<ControlPanelState>['api'] &
  PublishesUnsavedChanges;

export const buildControlPanelApi = (
  uuid: string,
  originalPanelState: ControlPanelState,
  originalApi: DefaultEmbeddableApi
): ControlPanelApi => {
  const panelStateManager = initializeStateManager<ControlPanelState>(
    originalPanelState,
    defaultPanelState,
    panelStateComparators
  );

  console.log({ originalPanelState });

  const unsavedChangesApi = initializeUnsavedChanges<ControlPanelState>({
    uuid,
    parentApi: originalApi.parentApi,
    serializeState: () => ({ rawState: panelStateManager.getLatestState() }),
    anyStateChange$: panelStateManager.anyStateChange$.pipe(map(() => undefined)),
    getComparators: () => panelStateComparators,
    defaultState: defaultPanelState,
    onReset: (lastSaved) => {
      console.log({
        lastSaved: pick(lastSaved.rawState, ['width', 'grow', 'order']),
        current: panelStateManager.getLatestState(),
      });
      panelStateManager.reinitializeState(
        pick(lastSaved.rawState, ['width', 'grow', 'order']),
        panelStateComparators
      );
    },
  });

  panelStateManager.anyStateChange$.subscribe(() => {
    console.log({ latest: panelStateManager.getLatestState() });
  });

  return {
    ...originalApi,
    ...panelStateManager.api,
    hasUnsavedChanges$: apiPublishesUnsavedChanges(originalApi)
      ? merge(originalApi.hasUnsavedChanges$, unsavedChangesApi.hasUnsavedChanges$)
      : unsavedChangesApi.hasUnsavedChanges$,
    resetUnsavedChanges: async () => {
      if (apiPublishesUnsavedChanges(originalApi))
        await Promise.all([
          originalApi.resetUnsavedChanges(),
          unsavedChangesApi.resetUnsavedChanges(),
        ]);
      else {
        await unsavedChangesApi.resetUnsavedChanges();
      }
    },
    serializeState: () => {
      return {
        rawState: {
          ...originalApi.serializeState().rawState,
          ...panelStateManager.getLatestState(),
        },
      };
    },
  };
};

const panelStateComparators: StateComparators<ControlPanelState> = {
  width: 'referenceEquality',
  grow: 'referenceEquality',
  order: 'referenceEquality',
};

const defaultPanelState = {
  width: DEFAULT_CONTROL_WIDTH as ControlPanelState['width'],
  grow: DEFAULT_CONTROL_GROW,
  order: undefined,
};
