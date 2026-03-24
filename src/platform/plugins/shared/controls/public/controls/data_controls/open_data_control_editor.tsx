/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import React from 'react';
import deepEqual from 'react-fast-compare';
import type { DataControlState } from '@kbn/controls-schemas';

import { coreServices } from '../../services/kibana_services';

export const openDataControlEditor = <State extends DataControlState = DataControlState>({
  initialState,
  parentApi,
  setLastUsedDataViewId,
  isPinned,
  controlId,
  controlType,
  initialDefaultPanelTitle,
  onUpdate,
}: {
  initialState: Partial<State>;
  parentApi: unknown;
  setLastUsedDataViewId?: (dataViewId: string) => void;
  isPinned?: boolean;
  // these props are only provided when the control already exists and is being edited
  controlId?: string;
  controlType?: string;
  initialDefaultPanelTitle?: string;
  onUpdate?: (newState: Partial<State & SerializedTitles>) => void;
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
    parentApi,
    loadContent: async ({ closeFlyout }) => {
      const { DataControlEditor } = await import('./data_control_editor');
      return (
        <DataControlEditor<State>
          ariaLabelledBy="control-editor-title-input"
          parentApi={parentApi}
          initialState={initialState}
          controlType={controlType}
          controlId={controlId}
          initialDefaultPanelTitle={initialDefaultPanelTitle}
          onUpdate={(state) => onUpdate?.(state)}
          onCancel={(state) => {
            onCancel(state, closeFlyout);
          }}
          onSave={(dataViewId) => {
            closeFlyout();
            if (setLastUsedDataViewId && dataViewId) setLastUsedDataViewId(dataViewId);
          }}
          isPinned={isPinned}
        />
      );
    },
    flyoutProps: {
      triggerId: 'dashboard-controls-menu-button',
      focusedPanelId: controlId,
    },
  });
};
