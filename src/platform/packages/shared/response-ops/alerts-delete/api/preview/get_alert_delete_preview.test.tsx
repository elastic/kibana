/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getAlertDeletePreview } from './get_alert_delete_preview';

const http = httpServiceMock.createStartContract();

describe('getAlertDeletePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the correct HTTP request and parses the response', async () => {
    http.get.mockResolvedValue({ affected_alert_count: 42 });

    const result = await getAlertDeletePreview({
      services: { http },
      requestQuery: {
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 0,
        categoryIds: ['management'],
      },
    });

    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('/internal/alerting/rules/settings/_alert_delete_preview'),
      expect.objectContaining({
        query: {
          active_alert_delete_threshold: 10,
          inactive_alert_delete_threshold: 0,
          category_ids: ['management'],
        },
      })
    );

    expect(result).toEqual({ affectedAlertCount: 42 });
  });

  it('throws an error if the API call fails', async () => {
    http.get.mockRejectedValue(new Error('API Error'));

    await expect(() =>
      getAlertDeletePreview({
        services: { http },
        requestQuery: {
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 0,
          categoryIds: ['management'],
        },
      })
    ).rejects.toThrow('API Error');

    expect(http.get).toHaveBeenCalled();
  });
});
