/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchResponseBody } from './_global.search'
import { Duration, RequestBase, ScrollId } from './_types'

/**
 * Run a scrolling search.
 *
 * IMPORTANT: The scroll API is no longer recommend for deep pagination. If you need to preserve the index state while paging through more than 10,000 hits, use the `search_after` parameter with a point in time (PIT).
 *
 * The scroll API gets large sets of results from a single scrolling search request.
 * To get the necessary scroll ID, submit a search API request that includes an argument for the `scroll` query parameter.
 * The `scroll` parameter indicates how long Elasticsearch should retain the search context for the request.
 * The search response returns a scroll ID in the `_scroll_id` response body parameter.
 * You can then use the scroll ID with the scroll API to retrieve the next batch of results for the request.
 * If the Elasticsearch security features are enabled, the access to the results of a specific scroll ID is restricted to the user or API key that submitted the search.
 *
 * You can also use the scroll API to specify a new scroll parameter that extends or shortens the retention period for the search context.
 *
 * IMPORTANT: Results from a scrolling search reflect the state of the index at the time of the initial search request. Subsequent indexing or document changes only affect later search and scroll requests.
 */
export const ScrollRequest = z.object({
  ...RequestBase.shape,
  rest_total_hits_as_int: z.boolean().describe('If true, the API response’s hit.total property is returned as an integer. If false, the API response’s hit.total property is returned as an object.').optional().meta({ found_in: 'query' }),
  scroll: Duration.describe('The period to retain the search context for scrolling.').optional().meta({ found_in: 'body' }),
  scroll_id: ScrollId.describe('The scroll ID of the search.').meta({ found_in: 'body' })
}).meta({ id: 'ScrollRequest' })
export type ScrollRequest = z.infer<typeof ScrollRequest>

export const ScrollResponse = SearchResponseBody.meta({ id: 'ScrollResponse' })
export type ScrollResponse = z.infer<typeof ScrollResponse>
