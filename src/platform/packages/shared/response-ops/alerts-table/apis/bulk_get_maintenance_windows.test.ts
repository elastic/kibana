/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { bulkGetMaintenanceWindows } from './bulk_get_maintenance_windows';

describe('bulkGetMaintenanceWindows', () => {
  const mockCoreSetup = coreMock.createSetup();
  const http = mockCoreSetup.http;

  beforeEach(() => {
    jest.clearAllMocks();
    http.post.mockResolvedValue({ maintenance_windows: [], errors: [] });
  });

  it('fetch maintenance windows correctly', async () => {
    const res = await bulkGetMaintenanceWindows({
      http,
      ids: ['test-id-1', 'test-id-2'],
    });
    expect(res).toEqual({ maintenanceWindows: [], errors: [] });
  });

  it('should call http with correct arguments', async () => {
    await bulkGetMaintenanceWindows({
      http,
      ids: ['test-id-1', 'test-id-2'],
    });

    expect(http.post).toHaveBeenCalledWith(
      '/internal/alerting/rules/maintenance_window/_bulk_get',
      {
        body: '{"ids":["test-id-1","test-id-2"]}',
      }
    );
  });
});
