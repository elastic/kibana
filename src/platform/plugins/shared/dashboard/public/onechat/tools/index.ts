/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { DashboardApi } from '../../dashboard_api/types';
import type { CoreStart } from '@kbn/core/public';
import { createAddPanelTool } from './add_panel';
import { createRemovePanelTool } from './remove_panel';
import { createEditPanelTool } from './edit_panel';
import { createChangeFiltersTool } from './change_filters';
import { createChangeTimerangeTool } from './change_timerange';
import { createSetQueryTool } from './set_query';
import { createCreateDashboardTool } from './create_dashboard';

/**
 * Creates all browser API tools for dashboard manipulation
 */
export function createDashboardBrowserApiTools(
  dashboardApi: DashboardApi,
  coreStart: CoreStart
): BrowserApiToolDefinition<any>[] {
  return [
    createAddPanelTool(dashboardApi),
    createRemovePanelTool(dashboardApi),
    createEditPanelTool(dashboardApi),
    createChangeFiltersTool(dashboardApi),
    createChangeTimerangeTool(dashboardApi),
    createSetQueryTool(dashboardApi),
    createCreateDashboardTool(coreStart),
  ];
}

