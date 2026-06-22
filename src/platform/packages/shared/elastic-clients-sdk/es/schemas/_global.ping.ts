/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { RequestBase } from './_types'

/**
 * Ping the cluster.
 *
 * Get information about whether the cluster is running.
 */
export const PingRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'PingRequest' })
export type PingRequest = z.infer<typeof PingRequest>

export const PingResponse = z.boolean().meta({ id: 'PingResponse' })
export type PingResponse = z.infer<typeof PingResponse>
