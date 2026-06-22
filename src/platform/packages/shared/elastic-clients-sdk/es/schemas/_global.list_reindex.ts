/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ErrorCause, ReindexTaskInfo, RequestBase, TaskFailure } from './_types'

/**
 * List active reindex tasks.
 *
 * Get information about all currently running reindex tasks.
 */
export const ListReindexRequest = z.object({
  ...RequestBase.shape,
  detailed: z.boolean().describe('If `true`, include detailed task status information in the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ListReindexRequest' })
export type ListReindexRequest = z.infer<typeof ListReindexRequest>

export const ListReindexResponse = z.object({
  reindex: z.array(ReindexTaskInfo).describe('The list of currently running reindex tasks.'),
  task_failures: z.array(TaskFailure).describe('Task-level failures that occurred while listing reindex tasks.').optional(),
  node_failures: z.array(z.lazy(() => ErrorCause)).describe('Node-level failures that occurred while listing reindex tasks.').optional()
}).meta({ id: 'ListReindexResponse' })
export type ListReindexResponse = z.infer<typeof ListReindexResponse>
