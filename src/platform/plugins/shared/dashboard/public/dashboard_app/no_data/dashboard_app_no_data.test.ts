/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { coreServices, dataService } from '../../services/kibana_services';
import { mockDashboardBackupService } from '../../services/mocks';
import { isDashboardAppInNoDataState } from './dashboard_app_no_data';
import { DATASETS_ROUTE } from '@kbn/esql-types';

vi.mock('../../dashboard_client', () => {
  const mocked = {
    dashboardClient: {
      search: vi.fn().mockResolvedValue({ meta: { total: 0 } }),
    },
  };
  return { ...mocked, default: mocked };
});

import { dashboardClient } from '../../dashboard_client';

describe('isDashboardAppInNoDataState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataService.dataViews.hasData.hasDataView = vi.fn().mockResolvedValue(false);
    (coreServices.http.get as Mock).mockResolvedValue({ datasets: [] });
    mockDashboardBackupService.dashboardHasUnsavedEdits.mockReturnValue(false);
    (dashboardClient.search as Mock).mockResolvedValue({ meta: { total: 0 } });
  });

  it('returns false when the user has a data view', async () => {
    dataService.dataViews.hasData.hasDataView = vi.fn().mockResolvedValue(true);
    expect(await isDashboardAppInNoDataState()).toBe(false);
    expect(coreServices.http.get).not.toHaveBeenCalled();
  });

  it('returns false when ES|QL datasets exist', async () => {
    (coreServices.http.get as Mock).mockImplementation((path: string) => {
      if (path === DATASETS_ROUTE) {
        return Promise.resolve({
          datasets: [{ name: 'my_dataset', data_source: 's3', resource: 'bucket/data' }],
        });
      }
      return Promise.resolve({});
    });
    expect(await isDashboardAppInNoDataState()).toBe(false);
    expect(dashboardClient.search).not.toHaveBeenCalled();
  });

  it('returns false when there are unsaved dashboard edits', async () => {
    mockDashboardBackupService.dashboardHasUnsavedEdits.mockReturnValue(true);
    expect(await isDashboardAppInNoDataState()).toBe(false);
    expect(dashboardClient.search).not.toHaveBeenCalled();
  });

  it('returns false when at least one saved dashboard exists', async () => {
    (dashboardClient.search as Mock).mockResolvedValue({ meta: { total: 1 } });
    expect(await isDashboardAppInNoDataState()).toBe(false);
  });

  it('returns true when no user data view, no datasets, no unsaved edits, and no saved dashboards', async () => {
    expect(await isDashboardAppInNoDataState()).toBe(true);
  });

  it('treats a failed datasets request as no datasets', async () => {
    (coreServices.http.get as Mock).mockRejectedValue(new Error('network error'));
    expect(await isDashboardAppInNoDataState()).toBe(true);
  });
});
