/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementService } from '../../kibana_services';
import { changeAccessMode } from './change_access_mode';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';

describe('changeAccessMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contentManagementService.client.changeAccessMode = jest.fn().mockResolvedValue(undefined);
  });

  it('should call contentManagementService.client.changeAccessMode with correct parameters for a single id', async () => {
    const props = {
      ids: ['dashboard-id-1'],
      accessMode: 'read_only' as const,
    };

    await changeAccessMode(props);

    expect(contentManagementService.client.changeAccessMode).toHaveBeenCalledWith({
      objects: [
        {
          contentTypeId: DASHBOARD_CONTENT_ID,
          id: 'dashboard-id-1',
        },
      ],
      options: {
        accessMode: 'read_only',
      },
    });
  });

  it('should call contentManagementService.client.changeAccessMode with correct parameters for multiple ids', async () => {
    const props = {
      ids: ['dashboard-id-1', 'dashboard-id-2', 'dashboard-id-3'],
      accessMode: 'default' as const,
    };

    await changeAccessMode(props);

    expect(contentManagementService.client.changeAccessMode).toHaveBeenCalledWith({
      objects: [
        {
          contentTypeId: DASHBOARD_CONTENT_ID,
          id: 'dashboard-id-1',
        },
        {
          contentTypeId: DASHBOARD_CONTENT_ID,
          id: 'dashboard-id-2',
        },
        {
          contentTypeId: DASHBOARD_CONTENT_ID,
          id: 'dashboard-id-3',
        },
      ],
      options: {
        accessMode: 'default',
      },
    });
  });

  it('should handle errors from contentManagementService', async () => {
    contentManagementService.client.changeAccessMode = jest
      .fn()
      .mockRejectedValue(new Error('Failed to change access mode'));

    const props = {
      ids: ['dashboard-id-1'],
      accessMode: 'read_only' as const,
    };

    await expect(changeAccessMode(props)).rejects.toThrow('Failed to change access mode');
  });
});
