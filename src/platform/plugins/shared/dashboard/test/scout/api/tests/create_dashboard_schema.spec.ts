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
import { apiTest, DASHBOARD_API_PATH, KBN_ARCHIVES } from '../fixtures';
import snapshot from '../fixtures/schema_snapshot.json';

apiTest.describe('dashboard REST schema', { tag: tags.ESS_ONLY }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
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

    const createBodySchema =
      response.body.paths[oasPath].post.requestBody.content[
        'application/json; Elastic-Api-Version=1'
      ].schema;
    const panelsSchema = createBodySchema.properties.data.properties.panels;
    const panelSchema = panelsSchema.items.anyOf.find(
      (schema: { properties: Record<string, unknown> }) => 'config' in schema.properties
    );
    const configSchema = panelSchema.properties.config;

    expect(configSchema.anyOf).toHaveLength(2);
    expect(configSchema.anyOf).toStrictEqual(snapshot);
  });
});
