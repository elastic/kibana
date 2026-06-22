/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { StoredScript } from './_global.search'
import { Duration, Id, RequestBase } from './_types'

/**
 * Get a script or search template.
 *
 * Retrieves a stored script or search template.
 */
export const GetScriptRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the stored script or search template.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'GetScriptRequest' })
export type GetScriptRequest = z.infer<typeof GetScriptRequest>

export const GetScriptResponse = z.object({
  _id: Id,
  found: z.boolean(),
  script: StoredScript.optional()
}).meta({ id: 'GetScriptResponse' })
export type GetScriptResponse = z.infer<typeof GetScriptResponse>
