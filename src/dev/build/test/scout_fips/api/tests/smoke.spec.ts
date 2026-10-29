/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

apiTest.describe('FIPS distribution', { tag: tags.stateful.classic }, () => {
  apiTest('starts Kibana in FIPS mode', async ({ apiClient }) => {
    const response = await apiClient.get('/api/status');

    expect(response).toHaveStatusCode(200);
    expect(response.body.status.overall.level).toBe('available');
  });
});
