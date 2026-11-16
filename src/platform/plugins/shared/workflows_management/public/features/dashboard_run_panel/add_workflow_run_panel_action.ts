/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiCanAddNewPanel } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { UiActionsPresentableGroup } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { getWorkflowsCapabilities } from '@kbn/workflows-ui';
import { openConfigFlyout } from './open_config_flyout';
import { ADD_PANEL_GROUP_DISPLAY_NAME, PANEL_DISPLAY_NAME } from './translations';
import {
  ADD_WORKFLOW_RUN_PANEL_ACTION_ID,
  WORKFLOW_RUN_EMBEDDABLE_TYPE,
} from '../../../common/dashboard_run_panel/constants';
import type { WorkflowRunEmbeddableState } from '../../../server/dashboard_run_panel/schema';

const ADD_PANEL_AUTOMATION_GROUP: UiActionsPresentableGroup = {
  id: 'automations',
  getDisplayName: () => ADD_PANEL_GROUP_DISPLAY_NAME,
  getIconType: () => 'workflow',
  order: 0,
};

export const getAddWorkflowRunPanelAction = (
  core: CoreStart,
  isFlagEnabled: () => boolean
): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_WORKFLOW_RUN_PANEL_ACTION_ID,
  getIconType: () => 'play',
  order: 10,
  grouping: [ADD_PANEL_AUTOMATION_GROUP],
  getDisplayName: () => PANEL_DISPLAY_NAME,
  isCompatible: async ({ embeddable: parentApi }) =>
    isFlagEnabled() &&
    apiCanAddNewPanel(parentApi) &&
    getWorkflowsCapabilities(core.application.capabilities).canReadWorkflow,
  execute: async ({ embeddable: parentApi, returnFocus }) => {
    if (!apiCanAddNewPanel(parentApi)) throw new IncompatibleActionError();
    openConfigFlyout({
      core,
      parentApi,
      returnFocus,
      onSave: (config, workflowName) => {
        parentApi.addNewPanel<WorkflowRunEmbeddableState>({
          panelType: WORKFLOW_RUN_EMBEDDABLE_TYPE,
          serializedState: { ...config, title: workflowName },
        });
      },
    });
  },
});
