/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { DEFAULT_DASHBOARD_STATE } from '../../../common/default_dashboard_state';
import { coreServices } from '../../services/kibana_services';
import { reportDashboardSaved } from './report_dashboard_saved';

const dashboardState = {
  ...DEFAULT_DASHBOARD_STATE,
  panels: [
    { type: 'lens', config: {}, grid: { x: 0, y: 0, w: 12, h: 8 } },
    {
      title: 'Section',
      collapsed: false,
      grid: { y: 8 },
      panels: [
        { type: 'lens', config: {}, grid: { x: 0, y: 0, w: 12, h: 8 } },
        { type: 'search', config: {}, grid: { x: 12, y: 0, w: 12, h: 8 } },
      ],
    },
  ],
} as DashboardState;

describe('reportDashboardSaved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the first save of a new dashboard with its change sources', () => {
    reportDashboardSaved({
      previousDashboardId: undefined,
      dashboardId: 'new-id',
      dashboardState,
      changeSources: ['agent'],
    });

    expect(coreServices.analytics.reportEvent).toHaveBeenCalledWith('dashboard_saved', {
      is_new: true,
      is_copy: false,
      change_sources: ['agent'],
      panel_count: 3,
      panel_types: ['lens', 'lens', 'search'],
    });
  });

  it('reports a quick save of an existing dashboard without change sources', () => {
    reportDashboardSaved({
      previousDashboardId: 'existing-id',
      dashboardId: 'existing-id',
      dashboardState: DEFAULT_DASHBOARD_STATE,
      changeSources: [],
    });

    expect(coreServices.analytics.reportEvent).toHaveBeenCalledWith('dashboard_saved', {
      is_new: false,
      is_copy: false,
      panel_count: 0,
      panel_types: [],
    });
  });

  it('reports "Save as" of an existing dashboard as a new copy', () => {
    reportDashboardSaved({
      previousDashboardId: 'existing-id',
      dashboardId: 'copy-id',
      dashboardState: DEFAULT_DASHBOARD_STATE,
      changeSources: [],
    });

    expect(coreServices.analytics.reportEvent).toHaveBeenCalledWith('dashboard_saved', {
      is_new: true,
      is_copy: true,
      panel_count: 0,
      panel_types: [],
    });
  });
});
