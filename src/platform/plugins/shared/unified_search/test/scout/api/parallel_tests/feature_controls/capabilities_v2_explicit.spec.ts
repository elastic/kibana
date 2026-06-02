/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

/**
 * Validates the savedQueryManagement capability matrix for **v2** features
 * (`discover_v2`, `dashboard_v2`, `maps_v2`, `visualize_v2`), which require an
 * explicit `savedQueryManagement` feature privilege — there is no legacy
 * implicit derivation. Replaces the read-only badge + popover visibility
 * assertions previously run via the FTR `security_*.ts` v2 suite.
 */
apiTest.describe(
  'Saved query management capabilities - v2 (explicit savedQueryManagement privilege)',
  { tag: tags.stateful.classic },
  () => {
    for (const feature of testData.V2_FEATURES) {
      for (const matrixCase of testData.V2_MATRIX) {
        apiTest(`${feature} with ${matrixCase.label}`, async ({ apiClient, requestAuth }) => {
          const role = testData.buildSavedQueryRole(
            feature,
            matrixCase.featurePriv,
            matrixCase.sqmPriv
          );
          const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);

          const response = await apiClient.post('api/core/capabilities', {
            headers: { ...testData.COMMON_HEADERS, ...apiKeyHeader },
            responseType: 'json',
            body: { applications: [] },
          });

          expect(response).toHaveStatusCode(200);
          const caps = response.body as testData.CapabilitiesResponse;
          expect(caps.savedQueryManagement.showQueries).toBe(matrixCase.expected.showQueries);
          expect(caps.savedQueryManagement.saveQuery).toBe(matrixCase.expected.saveQuery);
        });
      }
    }
  }
);
