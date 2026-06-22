/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Id, RequestBase, integer } from './_types'

/**
 * Close a point in time.
 *
 * A point in time must be opened explicitly before being used in search requests.
 * The `keep_alive` parameter tells Elasticsearch how long it should persist.
 * A point in time is automatically closed when the `keep_alive` period has elapsed.
 * However, keeping points in time has a cost; close them as soon as they are no longer required for search requests.
 */
export const ClosePointInTimeRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The ID of the point-in-time.').meta({ found_in: 'body' })
}).meta({ id: 'ClosePointInTimeRequest' })
export type ClosePointInTimeRequest = z.infer<typeof ClosePointInTimeRequest>

export const ClosePointInTimeResponse = z.object({
  succeeded: z.boolean().describe('If `true`, all search contexts associated with the point-in-time ID were successfully closed.'),
  num_freed: integer.describe('The number of search contexts that were successfully closed.')
}).meta({ id: 'ClosePointInTimeResponse' })
export type ClosePointInTimeResponse = z.infer<typeof ClosePointInTimeResponse>
