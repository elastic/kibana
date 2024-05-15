/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, OverlayRef } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { ControlGroupApi } from '../control_group/types';
import { DataControlEditor } from './data_control_editor';
import { DataControlStateManager } from './initialize_data_control';
import { DataEditorState } from './types';

export const openDataControlEditor = async (
  stateManager: DataControlStateManager,
  isCreate: boolean,
  controlGroupApi: ControlGroupApi,
  services: {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
  }
): Promise<undefined> => {
  return new Promise((resolve) => {
    const closeOverlay = (overlayRef: OverlayRef) => {
      if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
        controlGroupApi.parentApi.clearOverlays();
      }
      overlayRef.close();
    };

    const overlay = services.core.overlays.openFlyout(
      toMountPoint(
        <DataControlEditor
          // api={embeddable}
          isCreate={isCreate}
          parentApi={controlGroupApi}
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
          services={{ dataViews: services.dataViews, core: services.core }}
          closeFlyout={() => {
            closeOverlay(overlay);
          }}
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
