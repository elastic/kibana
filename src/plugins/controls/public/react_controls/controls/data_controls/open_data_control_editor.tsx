/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import deepEqual from 'react-fast-compare';

import { OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { DefaultDataControlState } from '../../../../common';
import { coreServices } from '../../../services/kibana_services';
import type { ControlGroupApi } from '../../control_group/types';
import { DataControlEditor } from './data_control_editor';

export const openDataControlEditor = <
  State extends DefaultDataControlState = DefaultDataControlState
>({
  initialState,
  controlType,
  controlId,
  initialDefaultPanelTitle,
  onSave,
  controlGroupApi,
}: {
  initialState: Partial<State>;
  controlType?: string;
  controlId?: string;
  initialDefaultPanelTitle?: string;
  onSave: ({ type, state }: { type: string; state: Partial<State> }) => void;
  controlGroupApi: ControlGroupApi;
}): void => {
  const closeOverlay = (overlayRef: OverlayRef) => {
    if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
      controlGroupApi.parentApi.clearOverlays();
    }
    overlayRef.close();
  };

  const onCancel = (newState: Partial<State>, overlay: OverlayRef) => {
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
        controlGroupApi={controlGroupApi}
        initialState={initialState}
        controlType={controlType}
        controlId={controlId}
        initialDefaultPanelTitle={initialDefaultPanelTitle}
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
