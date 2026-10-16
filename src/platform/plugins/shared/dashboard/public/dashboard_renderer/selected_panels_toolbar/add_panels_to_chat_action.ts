/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApi } from '../../dashboard_api/types';

/**
 * Registered by the Agent Builder dashboards integration when AI chat is available. The dashboard
 * only shows the "Add to chat" button in the selected panels toolbar when this action exists and
 * is compatible.
 */
export const ADD_PANELS_TO_CHAT_ACTION_ID = 'addDashboardPanelsToChat';

export interface AddPanelsToChatActionContext {
  dashboardApi: DashboardApi;
  panelIds: string[];
}
