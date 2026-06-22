/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, Id, RequestBase } from './_types'

/**
 * Delete a script or search template.
 *
 * Deletes a stored script or search template.
 */
export const DeleteScriptRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the stored script or search template.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'DeleteScriptRequest' })
export type DeleteScriptRequest = z.infer<typeof DeleteScriptRequest>

export const DeleteScriptResponse = AcknowledgedResponseBase.meta({ id: 'DeleteScriptResponse' })
export type DeleteScriptResponse = z.infer<typeof DeleteScriptResponse>
