/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { StoredScript } from './_global.search'
import { AcknowledgedResponseBase, Duration, Id, Name, RequestBase } from './_types'

/**
 * Create or update a script or search template.
 *
 * Creates or updates a stored script or search template.
 */
export const PutScriptRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the stored script or search template. It must be unique within the cluster.').meta({ found_in: 'path' }),
  context: Name.describe('The context in which the script or search template should run. To prevent errors, the API immediately compiles the script or template in this context.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  script: StoredScript.describe('The script or search template, its parameters, and its language.').meta({ found_in: 'body' })
}).meta({ id: 'PutScriptRequest' })
export type PutScriptRequest = z.infer<typeof PutScriptRequest>

export const PutScriptResponse = AcknowledgedResponseBase.meta({ id: 'PutScriptResponse' })
export type PutScriptResponse = z.infer<typeof PutScriptResponse>
