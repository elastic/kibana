/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { ControlStateManager } from '../types';
import { ControlGroupEditor } from './control_group_editor';
import { ControlGroupEditorStrings } from './control_group_editor_constants';
import { ControlGroupApi, ControlGroupRuntimeState } from './types';

export const openEditControlGroupFlyout = (
  controlGroupApi: ControlGroupApi,
  stateManager: ControlStateManager<ControlGroupRuntimeState>,
  services: {
    core: CoreStart;
  }
) => {
  /**
   * Duplicate all state into a new manager because we do not want to actually apply the changes
   * to the control until the user hits save.
   */
  const editorStateManager: ControlStateManager<ControlGroupRuntimeState> = Object.keys(
    stateManager
  ).reduce((prev, key) => {
    return {
      ...prev,
      [key as keyof ControlGroupRuntimeState]: new BehaviorSubject(
        stateManager[key as keyof ControlGroupRuntimeState].getValue()
      ),
    };
  }, {} as ControlStateManager<ControlGroupRuntimeState>);

  const closeOverlay = (overlayRef: OverlayRef) => {
    if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
      controlGroupApi.parentApi.clearOverlays();
    }
    overlayRef.close();
  };

  const onDeleteAll = (ref: OverlayRef) => {
    services.core.overlays
      .openConfirm(ControlGroupEditorStrings.management.deleteControls.getSubtitle(), {
        confirmButtonText: ControlGroupEditorStrings.management.deleteControls.getConfirm(),
        cancelButtonText: ControlGroupEditorStrings.management.deleteControls.getCancel(),
        title: ControlGroupEditorStrings.management.deleteControls.getDeleteAllTitle(),
        buttonColor: 'danger',
      })
      .then((confirmed) => {
        if (confirmed)
          Object.keys(editorStateManager.panels).forEach((panelId) => {
            // this.removeEmbeddable(panelId)
            console.log('panel id', panelId);
          });
        ref.close();
      });
  };

  const overlay = services.core.overlays.openFlyout(
    toMountPoint(
      <ControlGroupEditor
        api={controlGroupApi}
        stateManager={editorStateManager}
        onSave={() => {
          Object.keys(stateManager).forEach((key) => {
            stateManager[key as keyof ControlGroupRuntimeState].next(
              editorStateManager[key as keyof ControlGroupRuntimeState].getValue()
            );
          });
          closeOverlay(overlay);
          // resolve(undefined);
        }}
        onDeleteAll={() => onDeleteAll(overlay)}
        onCancel={() => closeOverlay(overlay)}
      />,
      {
        theme: services.core.theme,
        i18n: services.core.i18n,
      }
    ),
    {
      'aria-label': i18n.translate('controls.controlGroup.manageControl', {
        defaultMessage: 'Edit control settings',
      }),
      outsideClickCloses: false,
      onClose: () => closeOverlay(overlay),
    }
  );

  if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
    controlGroupApi.parentApi.openOverlay(overlay);
  }
};
