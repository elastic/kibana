/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete an anomaly detection job.
 *
 * All job configuration, model state and results are deleted.
 * It is not currently possible to delete multiple jobs using wildcards or a
 * comma separated list. If you delete a job that has a datafeed, the request
 * first tries to delete the datafeed. This behavior is equivalent to calling
 * the delete datafeed API with the same timeout and force parameters as the
 * delete job request.
 */
export const MlDeleteJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  force: z.boolean().describe('Use to forcefully delete an opened job; this method is quicker than closing and deleting the job.').optional().meta({ found_in: 'query' }),
  delete_user_annotations: z.boolean().describe('Specifies whether annotations that have been added by the user should be deleted along with any auto-generated annotations when the job is reset.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('Specifies whether the request should return immediately or wait until the job deletion completes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteJobRequest' })
export type MlDeleteJobRequest = z.infer<typeof MlDeleteJobRequest>

export const MlDeleteJobResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteJobResponse' })
export type MlDeleteJobResponse = z.infer<typeof MlDeleteJobResponse>
