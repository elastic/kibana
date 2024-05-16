/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import deepEqual from 'react-fast-compare';

import { CoreStart, OverlayRef } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { ControlGroupApi } from '../control_group/types';
import { DataControlEditor } from './data_control_editor';
import { DataControlStateManager } from './initialize_data_control';
import { DataEditorState } from './types';

export const openDataControlEditor = async (
  stateManager: DataControlStateManager,
  controlGroupApi: ControlGroupApi,
  services: {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
  },
  controlType?: string
): Promise<undefined> => {
  return new Promise((resolve) => {
    const closeOverlay = (overlayRef: OverlayRef) => {
      if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
        controlGroupApi.parentApi.clearOverlays();
      }
      overlayRef.close();
    };

    const onCancel = (overlay: OverlayRef, newState: DataEditorState) => {
      const initialState = Object.keys(stateManager).reduce((prev, key) => {
        return { ...prev, [key]: stateManager[key as keyof DataControlStateManager].getValue() };
      }, {});

      if (deepEqual(initialState, newState)) {
        closeOverlay(overlay);
        return;
      }
      services.core.overlays
        .openConfirm(
          i18n.translate('controls.controlGroup.management.discard.sub', {
            defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
          }),
          {
            confirmButtonText: i18n.translate('controls.controlGroup.management.discard.confirm', {
              defaultMessage: 'Discard changes',
            }),
            cancelButtonText: i18n.translate('controls.controlGroup.management.discard.cancel', {
              defaultMessage: 'Cancel',
            }),
            title: i18n.translate('controls.controlGroup.management.discard.title', {
              defaultMessage: 'Discard changes?',
            }),
            buttonColor: 'danger',
          }
        )
        .then((confirmed) => {
          if (confirmed) {
            closeOverlay(overlay);
          }
        });
    };

    const overlay = services.core.overlays.openFlyout(
      toMountPoint(
        <DataControlEditor
          // api={embeddable}
          controlType={controlType}
          parentApi={controlGroupApi}
          onCancel={(newState: DataEditorState) => onCancel(overlay, newState)}
          onSave={(newState: DataEditorState) => {
            stateManager.dataViewId.next(newState.dataViewId);
            stateManager.fieldName.next(newState.fieldName);
            stateManager.grow.next(newState.grow);
            stateManager.width.next(newState.width);
            stateManager.title.next(newState.title);
            // stateManager.settings.next(newState.settings);
            closeOverlay(overlay);
            resolve(undefined);
          }}
          stateManager={stateManager}
          services={{ dataViews: services.dataViews }}
        />,
        {
          theme: services.core.theme,
          i18n: services.core.i18n,
        }
      ),
      {
        onClose: () => closeOverlay(overlay),
      }
    );

    if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
      controlGroupApi.parentApi.openOverlay(overlay);
    }
  });
};
