/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { alertDeletePreviewApiCall } from './api_call';

const http = httpServiceMock.createStartContract();

describe('alertDeletePreviewApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the correct HTTP request and parses the response', async () => {
    http.get.mockResolvedValue({ affected_alert_count: 42 });

    const result = await alertDeletePreviewApiCall({
      services: { http },
      requestQuery: {
        isActiveAlertDeleteEnabled: true,
        isInactiveAlertDeleteEnabled: false,
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 0,
        categoryIds: ['category1'],
      },
    });

    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('_alert_delete_preview'),
      expect.objectContaining({
        query: {
          is_active_alert_delete_enabled: true,
          is_inactive_alert_delete_enabled: false,
          active_alert_delete_threshold: 10,
          inactive_alert_delete_threshold: 0,
          category_ids: ['category1'],
        },
      })
    );

    expect(result).toEqual({ affectedAlertCount: 42 });
  });

  it('throws an error if the API call fails', async () => {
    http.get.mockRejectedValue(new Error('API Error'));

    await expect(
      alertDeletePreviewApiCall({
        services: { http },
        requestQuery: {
          isActiveAlertDeleteEnabled: true,
          isInactiveAlertDeleteEnabled: false,
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 0,
          categoryIds: ['category1'],
        },
      })
    ).rejects.toThrow('API Error');

    expect(http.get).toHaveBeenCalled();
  });
});
