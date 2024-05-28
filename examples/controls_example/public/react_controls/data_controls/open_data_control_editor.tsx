/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';

import { CoreStart, OverlayRef } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { ControlGroupApi } from '../control_group/types';
import { DataControlEditor } from './data_control_editor';
import { DefaultDataControlState } from './types';
import { ControlStateManager } from '../types';

export const openDataControlEditor = async <
  State extends DefaultDataControlState = DefaultDataControlState
>(
  stateManager: ControlStateManager<State>,
  controlGroupApi: ControlGroupApi,
  services: {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
  },
  controlType?: string,
  controlId?: string
): Promise<undefined> => {
  return new Promise((resolve) => {
    /**
     * Duplicate all state into a new manager because we do not want to actually apply the changes
     * to the control until the user hits save.
     */
    const editorStateManager: ControlStateManager<State> = Object.keys(stateManager).reduce(
      (prev, key) => {
        return {
          ...prev,
          [key as keyof State]: new BehaviorSubject(stateManager[key as keyof State].getValue()),
        };
      },
      {} as ControlStateManager<State>
    );

    const closeOverlay = (overlayRef: OverlayRef) => {
      if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
        controlGroupApi.parentApi.clearOverlays();
      }
      overlayRef.close();
    };

    const onCancel = (overlay: OverlayRef) => {
      const initialState = Object.keys(stateManager).map((key) => {
        return stateManager[key as keyof State].getValue();
      });
      const newState = Object.keys(editorStateManager).map((key) => {
        return editorStateManager[key as keyof State].getValue();
      });

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
          controlId={controlId}
          controlType={controlType}
          parentApi={controlGroupApi}
          onCancel={() => {
            onCancel(overlay);
          }}
          onSave={() => {
            Object.keys(stateManager).forEach((key) => {
              stateManager[key as keyof State].next(
                editorStateManager[key as keyof State].getValue()
              );
            });
            closeOverlay(overlay);
            resolve(undefined);
          }}
          stateManager={editorStateManager}
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
