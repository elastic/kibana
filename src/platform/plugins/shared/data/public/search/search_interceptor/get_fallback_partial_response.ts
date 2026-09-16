/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IEsSearchResponse } from '@kbn/search-types';

/**
 * The response from the stop endpoint includes more fields that are not represented in the IEsSearchResponse interface, the most
 * relevant ones are included so that the response can be used in place of the original response.
 */
type FallbackPartialResponse = IEsSearchResponse & {
  rawResponse: IEsSearchResponse['rawResponse'] & {
    is_running: boolean;
    columns: Array<{ name: string; type: string }>;
    values: Array<Array<unknown>>;
  };
};

/**
 * When a search is aborted and the endpoint times out we need to make discover responsive again so the user isn't stuck on
 * an infinite loading loop. A minimal response can be returned in place so the "No results" message is displayed and the
 * user can continue to interact with the application.
 * @param id - The id of the search.
 * @returns A fallback partial response.
 */
export function getFallbackPartialResponse(id: string | undefined): FallbackPartialResponse {
  return {
    id,
    rawResponse: {
      is_running: false,
      columns: [],
      values: [],
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 0,
        total: 0,
      },
      hits: { hits: [] },
    },
  };
}
