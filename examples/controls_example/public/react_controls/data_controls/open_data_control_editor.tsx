/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import deepEqual from 'react-fast-compare';

import { OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { ControlGroupApi } from '../control_group/types';
import { coreServices } from '../services/kibana_services';
import { DataControlEditor } from './data_control_editor';
import { DefaultDataControlState } from './types';

export type DataControlEditorState = Partial<DefaultDataControlState> & {
  controlType?: string;
  controlId?: string;
  defaultPanelTitle?: string;
};

export const openDataControlEditor = <
  State extends DataControlEditorState = DataControlEditorState
>({
  initialState,
  onSave,
  controlGroupApi,
}: {
  initialState: State;
  onSave: ({ type, state }: { type: string; state: State }) => void;
  controlGroupApi: ControlGroupApi;
}): void => {
  const closeOverlay = (overlayRef: OverlayRef) => {
    if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
      controlGroupApi.parentApi.clearOverlays();
    }
    overlayRef.close();
  };

  const onCancel = (newState: State, overlay: OverlayRef) => {
    if (deepEqual(initialState, newState)) {
      closeOverlay(overlay);
      return;
    }
    coreServices.overlays
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

  const overlay = coreServices.overlays.openFlyout(
    toMountPoint(
      <DataControlEditor<State>
        parentApi={controlGroupApi}
        initialState={initialState}
        onCancel={(state) => {
          onCancel(state, overlay);
        }}
        onSave={(state, selectedControlType) => {
          closeOverlay(overlay);
          onSave({ type: selectedControlType, state });
        }}
      />,
      {
        theme: coreServices.theme,
        i18n: coreServices.i18n,
      }
    ),
    {
      onClose: () => closeOverlay(overlay),
    }
  );

  if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
    controlGroupApi.parentApi.openOverlay(overlay);
  }
};
