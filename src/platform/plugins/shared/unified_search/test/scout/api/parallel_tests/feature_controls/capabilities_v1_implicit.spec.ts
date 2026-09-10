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
 * Validates the savedQueryManagement capability matrix for **v1** features
 * (`discover`, `dashboard`, `maps`, `visualize`), where the feature's `all`
 * privilege implicitly grants saved-query manage rights. This is the legacy
 * derivation that exists for backward compatibility with pre-v2 roles.
 * Replaces the read-only badge + popover visibility assertions previously run
 * via the FTR `security_*.ts` v1 suite.
 */
apiTest.describe(
  'Saved query management capabilities - v1 (implicit savedQueryManagement on feature `all`)',
  { tag: tags.stateful.classic },
  () => {
    for (const feature of testData.V1_FEATURES) {
      for (const matrixCase of testData.V1_MATRIX) {
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
