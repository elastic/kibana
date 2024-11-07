/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchAlertsIndexNames } from '.';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '../../constants';

describe('fetchAlertsIndexNames', () => {
  const http = httpServiceMock.createStartContract();

  it('calls the alerts/index API with the correct parameters', async () => {
    const featureIds = [AlertConsumers.STACK_ALERTS, AlertConsumers.APM];
    const indexNames = ['test-index'];
    http.get.mockResolvedValueOnce({
      index_name: indexNames,
    });
    const result = await fetchAlertsIndexNames({ http, featureIds });
    expect(result).toEqual(indexNames);
    expect(http.get).toHaveBeenLastCalledWith(`${BASE_RAC_ALERTS_API_PATH}/index`, {
      query: { features: featureIds.join(',') },
    });
  });
});
