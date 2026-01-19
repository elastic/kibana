/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchUnifiedAlertsFields } from './fetch_unified_alerts_fields';

describe('fetchUnifiedAlertsFields', () => {
  const http = httpServiceMock.createStartContract();
  const ruleTypeIds = ['.es-query'];
  test('should call the alerts fields API with the correct parameters', async () => {
    http.get.mockResolvedValueOnce({
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });

    await fetchUnifiedAlertsFields({ http, ruleTypeIds });

    expect(http.get).toHaveBeenLastCalledWith('/internal/rac/alerts/fields', {
      query: { rule_type_ids: ruleTypeIds },
    });
  });

  test('should return alerts fields correctly', async () => {
    http.get.mockResolvedValueOnce({
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
    const result = await fetchUnifiedAlertsFields({ http, ruleTypeIds });

    expect(result).toEqual({
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
  });

  test('should not return alerts fields when error', async () => {
    http.get.mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(fetchUnifiedAlertsFields({ http, ruleTypeIds })).rejects.toThrow(
      'Failed to fetch'
    );
  });
});
