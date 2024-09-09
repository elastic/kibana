/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { ControlStateManager } from '../controls/types';
import { ControlGroupEditor } from './components/control_group_editor';
import { ControlGroupApi, ControlGroupEditorState } from './types';

export const openEditControlGroupFlyout = (
  controlGroupApi: ControlGroupApi,
  stateManager: ControlStateManager<ControlGroupEditorState>,
  services: {
    core: CoreStart;
  }
) => {
  /**
   * Duplicate all state into a new manager because we do not want to actually apply the changes
   * to the control group until the user hits save.
   */
  const editorStateManager: ControlStateManager<ControlGroupEditorState> = Object.keys(
    stateManager
  ).reduce((prev, key) => {
    return {
      ...prev,
      [key as keyof ControlGroupEditorState]: new BehaviorSubject(
        stateManager[key as keyof ControlGroupEditorState].getValue()
      ),
    };
  }, {} as ControlStateManager<ControlGroupEditorState>);

  const closeOverlay = (overlayRef: OverlayRef) => {
    if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
      controlGroupApi.parentApi.clearOverlays();
    }
    overlayRef.close();
  };

  const onDeleteAll = (ref: OverlayRef) => {
    services.core.overlays
      .openConfirm(
        i18n.translate('controls.controlGroup.management.delete.sub', {
          defaultMessage: 'Controls are not recoverable once removed.',
        }),
        {
          confirmButtonText: i18n.translate('controls.controlGroup.management.delete.confirm', {
            defaultMessage: 'Delete',
          }),
          cancelButtonText: i18n.translate('controls.controlGroup.management.delete.cancel', {
            defaultMessage: 'Cancel',
          }),
          title: i18n.translate('controls.controlGroup.management.delete.deleteAllTitle', {
            defaultMessage: 'Delete all controls?',
          }),
          buttonColor: 'danger',
        }
      )
      .then((confirmed) => {
        if (confirmed)
          Object.keys(controlGroupApi.children$.getValue()).forEach((childId) => {
            controlGroupApi.removePanel(childId);
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
            (
              stateManager[key as keyof ControlGroupEditorState] as BehaviorSubject<
                ControlGroupEditorState[keyof ControlGroupEditorState]
              >
            ).next(editorStateManager[key as keyof ControlGroupEditorState].getValue());
          });
          closeOverlay(overlay);
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
