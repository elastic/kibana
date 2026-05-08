/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';
import { shouldShowOpenDashboardLink } from './should_show_open_dashboard_link';

describe('shouldShowOpenDashboardLink', () => {
  it('hides the link when in the Dashboard app and viewing the saved dashboard', () => {
    expect(
      shouldShowOpenDashboardLink({
        currentAppId: DASHBOARD_APP_ID,
        viewedDashboardId: 'abc-123',
        savedDashboardId: 'abc-123',
      })
    ).toBe(false);
  });

  it('shows the link when in the Dashboard app but viewing a different dashboard (save as new)', () => {
    expect(
      shouldShowOpenDashboardLink({
        currentAppId: DASHBOARD_APP_ID,
        viewedDashboardId: 'old-id',
        savedDashboardId: 'new-id',
      })
    ).toBe(true);
  });

  it('shows the link when in another app, even when ids match', () => {
    expect(
      shouldShowOpenDashboardLink({
        currentAppId: 'agentBuilder',
        viewedDashboardId: 'abc-123',
        savedDashboardId: 'abc-123',
      })
    ).toBe(true);
  });

  it('shows the link when no dashboard was being viewed (creating a brand new dashboard)', () => {
    expect(
      shouldShowOpenDashboardLink({
        currentAppId: DASHBOARD_APP_ID,
        viewedDashboardId: undefined,
        savedDashboardId: 'new-id',
      })
    ).toBe(true);
  });

  it('shows the link when the current app id is not yet known', () => {
    expect(
      shouldShowOpenDashboardLink({
        currentAppId: undefined,
        viewedDashboardId: 'abc-123',
        savedDashboardId: 'abc-123',
      })
    ).toBe(true);
  });
});
