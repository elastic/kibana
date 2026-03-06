/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, DASHBOARD_API_PATH } from '../fixtures';

/**
 * Dashboard REST schema validation tests.
 *
 * These tests require the OAS (OpenAPI Specification) endpoint to be enabled,
 * which is configured in the custom server config at:
 * src/platform/packages/shared/kbn-scout/src/servers/configs/custom/oas_schema/
 *
 * See README.md for usage instructions.
 */
// Failing: See https://github.com/elastic/kibana/issues/256140
apiTest.describe.skip('dashboard REST schema', { tag: tags.stateful.all }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKey('viewer');
  });

  /**
   * Only additive changes are allowed to Dashboard REST schemas
   *
   * This test exists to ping #kibana-presentation of any embeddable schema changes
   * since the dashboard schema includes embeddable schemas.
   *
   * If this test is failing, the changed embeddable schema needs to be be reviewed
   * to ensure its ready for public distribution.
   *
   * Once an embeddable schema has been published,
   * it can only be changed with additive changes.
   */
  apiTest('Registered embeddable schemas have not changed', async ({ apiClient }) => {
    apiTest.setTimeout(90000); // takes about 70-80 seconds to run

    // OAS paths are stored with leading slashes, so we need to use the full path here
    const oasPath = `/${DASHBOARD_API_PATH}`;
    const response = await apiClient.get(
      `api/oas?pathStartsWith=${oasPath}&access=internal&version=1`,
      {
        headers: {
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.paths?.[`${oasPath}/{id}`]).toBeDefined();

    const createBodySchema =
      response.body.paths[`${oasPath}/{id}`].post.requestBody.content[
        'application/json; Elastic-Api-Version=1'
      ].schema;
    const panelsSchema = createBodySchema.properties.panels;
    expect(panelsSchema).toBeDefined();
    expect(panelsSchema.items.anyOf[0].oneOf).toHaveLength(9);
  });
});
