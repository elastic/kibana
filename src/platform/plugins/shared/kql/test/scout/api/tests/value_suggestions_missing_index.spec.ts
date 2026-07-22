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
import { apiTest, testData } from '../fixtures';

const { SUGGESTIONS_VALUES_PATH, COMMON_HEADERS, VALUE_SUGGESTIONS_READER_ROLE } = testData;

// The "missing index → 404" contract only holds on stateful Elasticsearch:
// serverless ES resolves a missing index to an empty `_terms_enum` result (200)
// instead of raising `index_not_found_exception`, so this case is stateful-only.
apiTest.describe(
  'Suggestions API - non time based - missing index',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(VALUE_SUGGESTIONS_READER_ROLE));
    });

    apiTest('returns 404 if index is not found', async ({ apiClient }) => {
      const response = await apiClient.post(`${SUGGESTIONS_VALUES_PATH}/not_found`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
        body: { field: 'baz.keyword', query: '1' },
      });

      expect(response).toHaveStatusCode(404);
    });
  }
);
