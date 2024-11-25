/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchAlertsFields } from '.';
import { AlertConsumers } from '@kbn/rule-data-utils';

describe('fetchAlertsFields', () => {
  const http = httpServiceMock.createStartContract();
  test('should call the browser_fields API with the correct parameters', async () => {
    const featureIds = [AlertConsumers.STACK_ALERTS];
    http.get.mockResolvedValueOnce({
      browserFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
    const result = await fetchAlertsFields({ http, featureIds });
    expect(result).toEqual({
      browserFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
    expect(http.get).toHaveBeenLastCalledWith('/internal/rac/alerts/browser_fields', {
      query: { featureIds },
    });
  });
});
