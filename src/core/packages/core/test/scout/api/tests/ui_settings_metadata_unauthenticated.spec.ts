/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import { INTERNAL_HEADERS } from '../fixtures';

const METADATA_PATHS = {
  namespace: '/internal/kibana/settings/metadata',
  global: '/internal/kibana/global_settings/metadata',
};

apiTest.describe(
  'ui settings metadata without credentials',
  { tag: tags.deploymentAgnostic },
  () => {
    for (const [scope, path] of Object.entries(METADATA_PATHS)) {
      apiTest(
        `rejects unauthenticated requests for the ${scope} definitions`,
        async ({ apiClient }) => {
          const response = await apiClient.get(path, {
            headers: INTERNAL_HEADERS,
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(401);
        }
      );
    }
  }
);
