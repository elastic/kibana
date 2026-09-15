/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UndiciConnection } from '@elastic/elasticsearch';
import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createEsClientForTesting } from '@kbn/test-es-server';
import { COMMON_HEADERS } from '../fixtures/constants';

const LEGACY_TEMPLATE_NAME = 'test-legacy-template-1';
const AUTOCOMPLETE_API = 'api/console/autocomplete_entities';
// `PUT _template` against a wildcard pattern emits one `Warning:` deprecation
// header per overlapping composable template; on a populated cluster this can
// exceed Node's default 16 KB `maxHeaderSize` and trip `HPE_HEADER_OVERFLOW`.
// Use a dedicated client (Undici-backed, since `maxHeaderSize` is only
// configurable on Undici's agent — Node's `http.Agent` does not accept it)
// for the legacy-template setup; the assertion against the production route
// still runs through the shared `apiClient` fixture.
// See https://github.com/elastic/kibana/issues/268028
const LEGACY_TEMPLATE_CLIENT_MAX_HEADER_SIZE = 64 * 1024;

apiTest.describe(
  'GET /api/console/autocomplete_entities — legacy templates',
  { tag: [...tags.stateful.classic] },
  () => {
    let credentials: RoleApiCredentials;
    let requestOptions: { headers: Record<string, string>; responseType: 'json' };
    let legacyTemplateClient: EsClient;

    apiTest.beforeAll(async ({ config, requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
      requestOptions = {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      };

      legacyTemplateClient = createEsClientForTesting({
        esUrl: config.hosts.elasticsearch,
        isCloud: config.isCloud,
        authOverride: config.auth,
        Connection: UndiciConnection,
        agent: { maxHeaderSize: LEGACY_TEMPLATE_CLIENT_MAX_HEADER_SIZE },
      });

      await legacyTemplateClient.indices.putTemplate({
        name: LEGACY_TEMPLATE_NAME,
        index_patterns: ['*'],
      });
    });

    apiTest.afterAll(async () => {
      await legacyTemplateClient.indices.deleteTemplate(
        { name: LEGACY_TEMPLATE_NAME },
        { ignore: [404] }
      );
      await legacyTemplateClient.close();
    });

    apiTest('returns legacy templates when templates setting is enabled', async ({ apiClient }) => {
      const response = await apiClient.get(`${AUTOCOMPLETE_API}?templates=true`, requestOptions);

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(response.body.legacyTemplates)).toContain(LEGACY_TEMPLATE_NAME);
    });
  }
);
