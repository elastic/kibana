/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { tracksOverlays } from '@kbn/presentation-util';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { ControlGroupApi, ControlGroupRuntimeState } from '../types';
import { ControlsEditor } from './control_editor';

export const openControlEditor = ({
  stateManager,
  isCreate,
  core,
  api,
}: {
  stateManager: StateManager<ControlGroupRuntimeState>;
  isCreate: boolean;
  core: CoreStart;
  api: ControlGroupApi;
}): Promise<{ savedBookId?: string }> => {
  const parent: unknown = api?.parentApi;
  return new Promise((resolve) => {
    const closeOverlay = (overlayRef: OverlayRef) => {
      if (tracksOverlays(parent)) parent.clearOverlays();
      overlayRef.close();
    };

    // const initialState = attributesManager.getLatestState();
    const overlay = core.overlays.openFlyout(
      toMountPoint(
        <ControlsEditor
          api={api}
          isCreate={isCreate}
          stateManager={stateManager}
          onCancel={() => {
            // set the state back to the initial state and reject
            // attributesManager.reinitializeState(initialState);
            closeOverlay(overlay);
          }}
          onSubmit={async (addToLibrary: boolean) => {
            // const savedBookId = addToLibrary
            //   ? await saveBookAttributes(api?.getSavedBookId(), attributesManager.getLatestState())
            //   : undefined;

            closeOverlay(overlay);
            resolve({});
          }}
        />,
        core
      ),
      {
        type: isCreate ? 'overlay' : 'push',
        size: 'm',
        onClose: () => closeOverlay(overlay),
      }
    );

    const overlayOptions = !isCreate && apiHasUniqueId(api) ? { focusedPanelId: api.uuid } : {};
    /**
     * if our parent needs to know about the overlay, notify it. This allows the parent to close the overlay
     * when navigating away, or change certain behaviors based on the overlay being open.
     */
    if (tracksOverlays(parent)) parent.openOverlay(overlay, overlayOptions);
  });
};
