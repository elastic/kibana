/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockDelete = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('../services/kibana_services', () => ({
  coreServices: {
    http: {
      delete: (...args: unknown[]) => mockDelete(...args),
      get: (...args: unknown[]) => mockGet(...args),
      put: (...args: unknown[]) => mockPut(...args),
    },
  },
}));

import { dashboardClient } from './dashboard_client';
import type { DashboardState } from '../../server';

describe('dashboardClient path encoding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue({});
    mockGet.mockResolvedValue({ meta: { outcome: 'exactMatch' } });
    mockPut.mockResolvedValue({});
  });

  it('encodes dashboard ids for delete requests', async () => {
    await dashboardClient.delete('../../../internal/security/users/test-user');

    expect(mockDelete).toHaveBeenCalledWith(
      '/api/dashboards/..%2F..%2F..%2Finternal%2Fsecurity%2Fusers%2Ftest-user',
      expect.objectContaining({ version: '1' })
    );
  });

  it('encodes dashboard ids for read requests', async () => {
    await dashboardClient.get('../../../internal/security/users/test-user');

    expect(mockGet).toHaveBeenCalledWith(
      '/internal/dashboards/app/..%2F..%2F..%2Finternal%2Fsecurity%2Fusers%2Ftest-user',
      expect.objectContaining({ version: '1' })
    );
  });

  it('encodes dashboard ids for update requests', async () => {
    await dashboardClient.update('../../../internal/security/users/test-user', {
      title: 'test',
    } as DashboardState);

    expect(mockPut).toHaveBeenCalledWith(
      '/internal/dashboards/app/..%2F..%2F..%2Finternal%2Fsecurity%2Fusers%2Ftest-user',
      expect.objectContaining({ version: '1' })
    );
  });
});
