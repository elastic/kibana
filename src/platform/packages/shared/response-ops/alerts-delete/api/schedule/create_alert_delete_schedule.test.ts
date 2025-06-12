/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createAlertDeleteSchedule } from './create_alert_delete_schedule';

const http = httpServiceMock.createStartContract();

describe('alertDeletePreviewApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the correct HTTP request and parses the response', async () => {
    http.post.mockResolvedValue(null);

    await createAlertDeleteSchedule({
      services: { http },
      requestBody: {
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 1,
        categoryIds: ['management'],
      },
    });

    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/internal/alerting/rules/settings/_alert_delete_schedule'),
      expect.objectContaining({
        body: JSON.stringify({
          active_alert_delete_threshold: 10,
          inactive_alert_delete_threshold: 1,
          category_ids: ['management'],
        }),
      })
    );
  });

  it('throws an error if the API call fails', async () => {
    http.post.mockRejectedValue(new Error('API Error'));

    await expect(() =>
      createAlertDeleteSchedule({
        services: { http },
        requestBody: {
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 1,
          categoryIds: ['management'],
        },
      })
    ).rejects.toThrow('API Error');

    expect(http.post).toHaveBeenCalled();
  });
});
