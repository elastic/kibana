/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { MsearchMultiSearchResult, MsearchMultisearchHeader } from './_global.msearch'
import { ScriptSource } from './_global.search'
import { Id, Indices, RequestBase, SearchType, long } from './_types'

export const MsearchTemplateTemplateConfig = z.object({
  explain: z.boolean().describe('If `true`, returns detailed information about score calculation as part of each hit.').optional(),
  id: Id.describe('The ID of the search template to use. If no `source` is specified, this parameter is required.').optional(),
  params: z.record(z.string(), z.any()).describe('Key-value pairs used to replace Mustache variables in the template. The key is the variable name. The value is the variable value.').optional(),
  profile: z.boolean().describe('If `true`, the query execution is profiled.').optional(),
  source: z.lazy(() => ScriptSource).describe('An inline search template. Supports the same parameters as the search API\'s request body. It also supports Mustache variables. If no `id` is specified, this parameter is required.').optional()
}).meta({ id: 'MsearchTemplateTemplateConfig' })
export type MsearchTemplateTemplateConfig = z.infer<typeof MsearchTemplateTemplateConfig>

export const MsearchTemplateRequestItem = z.union([MsearchMultisearchHeader, MsearchTemplateTemplateConfig]).meta({ id: 'MsearchTemplateRequestItem' })
export type MsearchTemplateRequestItem = z.infer<typeof MsearchTemplateRequestItem>

/**
 * Run multiple templated searches.
 *
 * Run multiple templated searches with a single request.
 * If you are providing a text file or text input to `curl`, use the `--data-binary` flag instead of `-d` to preserve newlines.
 * For example:
 *
 * ```
 * $ cat requests
 * { "index": "my-index" }
 * { "id": "my-search-template", "params": { "query_string": "hello world", "from": 0, "size": 10 }}
 * { "index": "my-other-index" }
 * { "id": "my-other-search-template", "params": { "query_type": "match_all" }}
 *
 * $ curl -H "Content-Type: application/x-ndjson" -XGET localhost:9200/_msearch/template --data-binary "@requests"; echo
 * ```
 */
export const MsearchTemplateRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases to search. It supports wildcards (`*`). To search all data streams and indices, omit this parameter or use `*`.').optional().meta({ found_in: 'path' }),
  ccs_minimize_roundtrips: z.boolean().describe('If `true`, network round-trips are minimized for cross-cluster search requests.').optional().meta({ found_in: 'query' }),
  max_concurrent_searches: long.describe('The maximum number of concurrent searches the API can run.').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('The type of the search operation.').optional().meta({ found_in: 'query' }),
  rest_total_hits_as_int: z.boolean().describe('If `true`, the response returns `hits.total` as an integer. If `false`, it returns `hits.total` as an object.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('If `true`, the response prefixes aggregation and suggester names with their respective types.').optional().meta({ found_in: 'query' }),
  search_templates: z.array(MsearchTemplateRequestItem).optional().meta({ found_in: 'body' })
}).meta({ id: 'MsearchTemplateRequest' })
export type MsearchTemplateRequest = z.infer<typeof MsearchTemplateRequest>

export const MsearchTemplateResponse = MsearchMultiSearchResult.meta({ id: 'MsearchTemplateResponse' })
export type MsearchTemplateResponse = z.infer<typeof MsearchTemplateResponse>
