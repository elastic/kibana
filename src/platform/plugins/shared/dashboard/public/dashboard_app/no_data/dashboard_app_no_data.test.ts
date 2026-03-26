/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../services/kibana_services', () => ({
  cpsService: {},
  coreServices: {},
  dataService: {
    dataViews: {
      hasData: {
        hasUserDataView: jest.fn(),
      },
    },
  },
  dataViewEditorService: undefined,
  embeddableService: undefined,
  lensService: undefined,
  noDataPageService: undefined,
  shareService: undefined,
}));

jest.mock('../../services/dashboard_backup_service', () => ({
  getDashboardBackupService: jest.fn(),
}));

jest.mock('../../dashboard_client', () => ({
  dashboardClient: {
    search: jest.fn(),
  },
}));

import { cpsService, dataService } from '../../services/kibana_services';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { dashboardClient } from '../../dashboard_client';
import { isDashboardAppInNoDataState } from './dashboard_app_no_data';

describe('isDashboardAppInNoDataState', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete (cpsService as { cpsManager?: {} }).cpsManager;
    (getDashboardBackupService as jest.Mock).mockReturnValue({
      dashboardHasUnsavedEdits: jest.fn().mockReturnValue(false),
    });
    (dataService.dataViews.hasData.hasUserDataView as jest.Mock).mockResolvedValue(false);
    (dashboardClient.search as jest.Mock).mockResolvedValue({ total: 0 });
  });

  it('returns false when CPS is enabled', async () => {
    (cpsService as { cpsManager?: {} }).cpsManager = {};

    await expect(isDashboardAppInNoDataState()).resolves.toBe(false);
    expect(dataService.dataViews.hasData.hasUserDataView).not.toHaveBeenCalled();
  });

  it('returns true when CPS is disabled and there is no local data', async () => {
    await expect(isDashboardAppInNoDataState()).resolves.toBe(true);
  });
});
