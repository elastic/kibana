/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchAlertsFieldsNewApi } from './fetch_alerts_fields_new_api';

describe('fetchAlertsFieldsNewApi', () => {
  const http = httpServiceMock.createStartContract();
  test('should call the alert_fields API with the correct parameters', async () => {
    const ruleTypeIds = ['.es-query'];

    http.get.mockResolvedValueOnce({
      alertFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
    const result = await fetchAlertsFieldsNewApi({ http, ruleTypeIds });
    expect(result).toEqual({
      alertFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
    expect(http.get).toHaveBeenLastCalledWith('/internal/rac/alerts/fields', {
      query: { ruleTypeIds },
    });
  });
});
