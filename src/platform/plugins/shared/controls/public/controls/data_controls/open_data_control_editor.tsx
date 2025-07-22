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
import { openLazyFlyout } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';

import type { DefaultDataControlState } from '../../../common';
import { coreServices } from '../../services/kibana_services';
import type { ControlGroupApi } from '../../control_group/types';

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
}) => {
  const onCancel = (newState: Partial<State>, closeFlyout: () => void) => {
    if (deepEqual(initialState, newState)) {
      closeFlyout();
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
          closeFlyout();
        }
      });
  };

  openLazyFlyout({
    core: coreServices,
    parentApi: controlGroupApi.parentApi,
    loadContent: async ({ closeFlyout }) => {
      const { DataControlEditor } = await import('./data_control_editor');
      return (
        <DataControlEditor<State>
          ariaLabelledBy="control-editor-title-input"
          controlGroupApi={controlGroupApi}
          initialState={initialState}
          controlType={controlType}
          controlId={controlId}
          initialDefaultPanelTitle={initialDefaultPanelTitle}
          onCancel={(state) => {
            onCancel(state, closeFlyout);
          }}
          onSave={(state, selectedControlType) => {
            closeFlyout();
            onSave({ type: selectedControlType, state });
          }}
        />
      );
    },
    triggerId: 'dashboard-controls-menu-button',
  });
};
