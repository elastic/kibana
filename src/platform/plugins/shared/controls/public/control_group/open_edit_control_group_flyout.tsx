/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';

import type { ControlGroupApi, ControlGroupEditorState } from './types';
import { coreServices } from '../services/kibana_services';
import { confirmDeleteAllControls } from '../common/confirm_delete_control';

export const openEditControlGroupFlyout = (
  controlGroupApi: ControlGroupApi,
  stateManager: StateManager<ControlGroupEditorState>
) => {
  const lastSavedState = stateManager.getLatestState();

  openLazyFlyout({
    core: coreServices,
    parentApi: controlGroupApi.parentApi,
    loadContent: async ({ closeFlyout }) => {
      const { ControlGroupEditor } = await import('./components/control_group_editor');
      return (
        <ControlGroupEditor
          api={controlGroupApi}
          stateManager={stateManager}
          onSave={closeFlyout}
          onDeleteAll={() => {
            confirmDeleteAllControls().then((confirmed) => {
              if (confirmed)
                Object.keys(controlGroupApi.children$.getValue()).forEach((childId) => {
                  controlGroupApi.removePanel(childId);
                });
              closeFlyout();
            });
          }}
          onCancel={() => {
            stateManager.reinitializeState(lastSavedState);
            closeFlyout();
          }}
        />
      );
    },
    flyoutProps: {
      'aria-label': i18n.translate('controls.controlGroup.manageControl', {
        defaultMessage: 'Edit control settings',
      }),
      outsideClickCloses: false,
      triggerId: 'dashboardAddTopNavButton',
    },
  });
};
