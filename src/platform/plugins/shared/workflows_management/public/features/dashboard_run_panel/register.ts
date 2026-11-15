/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ADD_WORKFLOW_RUN_PANEL_ACTION_ID,
  WORKFLOW_RUN_EMBEDDABLE_TYPE,
  WORKFLOWS_DASHBOARD_RUN_PANEL_FLAG,
} from '../../../common/dashboard_run_panel/constants';

/** Registers the Run workflow panel so dashboards can render it. Call from plugin setup. */
export const registerWorkflowRunPanel = (core: CoreSetup, embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddablePublicDefinition(WORKFLOW_RUN_EMBEDDABLE_TYPE, async () => {
    const [[coreStart], { getWorkflowRunEmbeddableFactory }] = await Promise.all([
      core.getStartServices(),
      import('./get_workflow_run_embeddable_factory'),
    ]);
    return getWorkflowRunEmbeddableFactory(coreStart);
  });
};

/**
 * Adds the Run workflow entry to the dashboard Add panel menu, shown while the feature flag is on.
 * Call from plugin start; unsubscribe the returned subscription on stop.
 */
export const registerAddWorkflowRunPanelAction = (
  core: CoreStart,
  uiActions: UiActionsStart
): Subscription => {
  let isFlagEnabled = false;
  const subscription = core.featureFlags
    .getBooleanValue$(WORKFLOWS_DASHBOARD_RUN_PANEL_FLAG, false)
    .subscribe((value) => {
      isFlagEnabled = value;
    });
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_WORKFLOW_RUN_PANEL_ACTION_ID, async () => {
    const { getAddWorkflowRunPanelAction } = await import('./add_workflow_run_panel_action');
    return getAddWorkflowRunPanelAction(core, () => isFlagEnabled);
  });
  return subscription;
};
