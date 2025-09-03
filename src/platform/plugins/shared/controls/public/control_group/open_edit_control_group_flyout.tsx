/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';

import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { ControlGroupEditor } from './components/control_group_editor';
import { ControlGroupApi, ControlGroupEditorState } from './types';
import { coreServices } from '../services/kibana_services';
import { confirmDeleteAllControls } from '../common/confirm_delete_control';

export const openEditControlGroupFlyout = (
  controlGroupApi: ControlGroupApi,
  stateManager: StateManager<ControlGroupEditorState>
) => {
  const lastSavedState = stateManager.getLatestState();

  const closeOverlay = (overlayRef: OverlayRef) => {
    if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
      controlGroupApi.parentApi.clearOverlays();
    }
    overlayRef.close();
  };

  const onDeleteAll = (ref: OverlayRef) => {
    confirmDeleteAllControls().then((confirmed) => {
      if (confirmed)
        Object.keys(controlGroupApi.children$.getValue()).forEach((childId) => {
          controlGroupApi.removePanel(childId);
        });
      closeOverlay(ref);
    });
  };

  const overlay = coreServices.overlays.openFlyout(
    toMountPoint(
      <ControlGroupEditor
        api={controlGroupApi}
        stateManager={stateManager}
        onSave={() => {
          closeOverlay(overlay);
        }}
        onDeleteAll={() => onDeleteAll(overlay)}
        onCancel={() => {
          stateManager.reinitializeState(lastSavedState);
          closeOverlay(overlay);
        }}
      />,
      coreServices
    ),
    {
      'aria-label': i18n.translate('controls.controlGroup.manageControl', {
        defaultMessage: 'Edit control settings',
      }),
      size: 'm',
      maxWidth: 500,
      paddingSize: 'm',
      outsideClickCloses: false,
      onClose: () => closeOverlay(overlay),
    }
  );

  if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
    controlGroupApi.parentApi.openOverlay(overlay);
  }
};
