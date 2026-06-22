/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script } from './_global.search'
import { IndexName, RequestBase } from './_types'
import { QueryDslQueryContainer } from './_types.query_dsl'

export const ScriptsPainlessExecutePainlessContext = z.enum(['painless_test', 'filter', 'score', 'boolean_field', 'date_field', 'double_field', 'geo_point_field', 'ip_field', 'keyword_field', 'long_field', 'composite_field']).meta({ id: 'ScriptsPainlessExecutePainlessContext' })
export type ScriptsPainlessExecutePainlessContext = z.infer<typeof ScriptsPainlessExecutePainlessContext>

export const ScriptsPainlessExecutePainlessContextSetup = z.object({
  document: z.any().describe('Document that\'s temporarily indexed in-memory and accessible from the script.'),
  index: IndexName.describe('Index containing a mapping that\'s compatible with the indexed document. You may specify a remote index by prefixing the index with the remote cluster alias. For example, `remote1:my_index` indicates that you want to run the painless script against the "my_index" index on the "remote1" cluster. This request will be forwarded to the "remote1" cluster if you have configured a connection to that remote cluster. NOTE: Wildcards are not accepted in the index expression for this endpoint. The expression `*:myindex` will return the error "No such remote cluster" and the expression `logs*` or `remote1:logs*` will return the error "index not found".'),
  query: z.lazy(() => QueryDslQueryContainer).describe('Use this parameter to specify a query for computing a score.').optional()
}).meta({ id: 'ScriptsPainlessExecutePainlessContextSetup' })
export type ScriptsPainlessExecutePainlessContextSetup = z.infer<typeof ScriptsPainlessExecutePainlessContextSetup>

/**
 * Run a script.
 *
 * Runs a script and returns a result.
 * Use this API to build and test scripts, such as when defining a script for a runtime field.
 * This API requires very few dependencies and is especially useful if you don't have permissions to write documents on a cluster.
 *
 * The API uses several _contexts_, which control how scripts are run, what variables are available at runtime, and what the return type is.
 *
 * Each context requires a script, but additional parameters depend on the context you're using for that script.
 */
export const ScriptsPainlessExecuteRequest = z.object({
  ...RequestBase.shape,
  context: ScriptsPainlessExecutePainlessContext.describe('The context that the script should run in. NOTE: Result ordering in the field contexts is not guaranteed.').optional().meta({ found_in: 'body' }),
  context_setup: ScriptsPainlessExecutePainlessContextSetup.describe('Additional parameters for the `context`. NOTE: This parameter is required for all contexts except `painless_test`, which is the default if no value is provided for `context`.').optional().meta({ found_in: 'body' }),
  script: z.lazy(() => Script).describe('The Painless script to run.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ScriptsPainlessExecuteRequest' })
export type ScriptsPainlessExecuteRequest = z.infer<typeof ScriptsPainlessExecuteRequest>

export const ScriptsPainlessExecuteResponse = z.object({
  result: z.any()
}).meta({ id: 'ScriptsPainlessExecuteResponse' })
export type ScriptsPainlessExecuteResponse = z.infer<typeof ScriptsPainlessExecuteResponse>
