/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkGlobalManageControlPrivilege } from './check_global_manage_control_privilege';

jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    http: {
      get: jest.fn(),
    },
  },
}));

import { coreServices } from '../../services/kibana_services';

describe('checkGlobalManageControlPrivilege', () => {
  const mockHttpGet = coreServices.http.get as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user is globally authorized', async () => {
    const mockResponse = {
      isGloballyAuthorized: true,
    };

    mockHttpGet.mockResolvedValue(mockResponse);

    const result = await checkGlobalManageControlPrivilege();

    expect(mockHttpGet).toHaveBeenCalledWith(
      '/api/dashboards/dashboard/access-control/global-authorization',
      {
        query: { apiVersion: '1' },
      }
    );
    expect(result).toBe(true);
  });

  it('should return false when user is not globally authorized', async () => {
    const mockResponse = {
      isGloballyAuthorized: false,
    };

    mockHttpGet.mockResolvedValue(mockResponse);

    const result = await checkGlobalManageControlPrivilege();

    expect(mockHttpGet).toHaveBeenCalledWith(
      '/api/dashboards/dashboard/access-control/global-authorization',
      {
        query: { apiVersion: '1' },
      }
    );
    expect(result).toBe(false);
  });

  it('should return false when response is undefined', async () => {
    mockHttpGet.mockResolvedValue(undefined);

    const result = await checkGlobalManageControlPrivilege();

    expect(result).toBe(false);
  });
});
