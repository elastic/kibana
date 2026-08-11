/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';

function createMockHttp(timeField?: string) {
  return {
    post: jest.fn(async () => ({ timeField })),
  } as unknown as HttpStart;
}

// U+00A0 non-breaking space pasted by Monaco autocomplete
const RAW_NBSP_QUERY = 'FROM logs';
const NORMALIZED_QUERY = 'FROM logs';

describe('getESQLTimeField', () => {
  let getESQLTimeField: typeof import('./get_time_field').getESQLTimeField;

  beforeEach(async () => {
    // Reset the module registry so each test starts with an empty timeFieldCache.
    jest.resetModules();
    ({ getESQLTimeField } = await import('./get_time_field'));
  });

  describe('non-breaking space normalization', () => {
    it('strips U+00A0 from the query before posting to the timefield API', async () => {
      const http = createMockHttp('@timestamp');

      await getESQLTimeField({ query: RAW_NBSP_QUERY, http });

      expect(http.post).toHaveBeenCalledWith(TIMEFIELD_ROUTE, {
        body: JSON.stringify({ query: NORMALIZED_QUERY }),
      });
    });

    it('shares one cache entry for the raw and normalized variants of the same query', async () => {
      const http = createMockHttp('@timestamp');

      await getESQLTimeField({ query: RAW_NBSP_QUERY, http });
      await getESQLTimeField({ query: NORMALIZED_QUERY, http });

      expect(http.post).toHaveBeenCalledTimes(1);
    });
  });
});
