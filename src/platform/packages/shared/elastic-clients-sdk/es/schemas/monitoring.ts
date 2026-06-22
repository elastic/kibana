/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { BulkOperationContainer, BulkUpdateAction } from './_global.bulk'
import { Duration, ErrorCause, RequestBase, long } from './_types'

/**
 * Send monitoring data.
 *
 * This API is used by the monitoring features to send monitoring data.
 */
export const MonitoringBulkRequest = z.object({
  ...RequestBase.shape,
  system_id: z.string().describe('Identifier of the monitored system').meta({ found_in: 'query' }),
  system_api_version: z.string().describe('').meta({ found_in: 'query' }),
  interval: Duration.describe('Collection interval (e.g., \'10s\' or \'10000ms\') of the payload').meta({ found_in: 'query' }),
  operations: z.array(z.union([BulkOperationContainer, BulkUpdateAction, z.any()])).optional().meta({ found_in: 'body' })
}).meta({ id: 'MonitoringBulkRequest' })
export type MonitoringBulkRequest = z.infer<typeof MonitoringBulkRequest>

export const MonitoringBulkResponse = z.object({
  error: z.lazy(() => ErrorCause).optional(),
  errors: z.boolean().describe('True if there is was an error'),
  ignored: z.boolean().describe('Was collection disabled?'),
  took: long
}).meta({ id: 'MonitoringBulkResponse' })
export type MonitoringBulkResponse = z.infer<typeof MonitoringBulkResponse>
