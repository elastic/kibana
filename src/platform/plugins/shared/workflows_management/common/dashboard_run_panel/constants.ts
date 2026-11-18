/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKFLOW_RUN_EMBEDDABLE_TYPE = 'workflow_run';

export const ADD_WORKFLOW_RUN_PANEL_ACTION_ID = 'addWorkflowRunPanelAction';

/**
 * Feature flag that shows the Run workflow panel in the dashboard Add panel menu. Panels already
 * saved on a dashboard keep rendering when it is off.
 */
export const WORKFLOWS_DASHBOARD_RUN_PANEL_FLAG = 'workflows.dashboardRunPanel.enabled';

export const WORKFLOW_RUN_PANEL_MAX_MAPPINGS = 50;
export const WORKFLOW_RUN_PANEL_MAX_CONSTANT_LENGTH = 10_000;
