/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiTest,
  tags,
  type ApiClientFixture,
  type ApiClientResponse,
  type RoleApiCredentials,
} from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ES_ARCHIVE_BASIC_INDEX,
  FIELDS_ROUTE_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

const CACHE_MAX_AGE_SETTING = 'data_views:cache_max_age';
const SETTINGS_PROPAGATION_TIMEOUT = 30_000;

// `data_views:cache_max_age` is not registered on serverless, so it can only be configured on classic.
apiTest.describe(
  `GET /${FIELDS_ROUTE_PATH} - cache headers (configurable max age)`,
  { tag: tags.stateful.classic },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    const getFields = (apiClient: ApiClientFixture) =>
      apiClient.get(`${FIELDS_ROUTE_PATH}?pattern=b*&include_unmapped=true`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      // Route only reads field metadata, so `viewer` is sufficient.
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.unset(CACHE_MAX_AGE_SETTING);

      // `cache.spec.ts` asserts the default `max-age` seconds later, so the revert has to converge too.
      await expect
        .poll(async () => (await getFields(apiClient)).headers['cache-control'], {
          timeout: SETTINGS_PROPAGATION_TIMEOUT,
          intervals: [1_000],
        })
        .toContain('max-age');
    });

    apiTest(
      'no-cache when data_views:cache_max_age set to zero',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CACHE_MAX_AGE_SETTING]: 0 });

        let response: ApiClientResponse | undefined;

        await expect
          .poll(
            async () => {
              response = await getFields(apiClient);

              // Returned, not thrown: throwing inside expect.poll aborts polling instead of retrying.
              return response.statusCode === 200
                ? response.headers['cache-control']
                : `status ${response.statusCode}`;
            },
            { timeout: SETTINGS_PROPAGATION_TIMEOUT, intervals: [1_000] }
          )
          .toBe('private, no-cache');

        expect(response?.headers.vary).toBe('accept-encoding, user-hash');
        expect(response?.headers.etag).toBeDefined();
      }
    );
  }
);
