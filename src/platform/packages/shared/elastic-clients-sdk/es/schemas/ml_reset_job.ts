/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from 'zod'

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
 * Reset an anomaly detection job.
 *
 * All model state and results are deleted. The job is ready to start over as if
 * it had just been created.
 * It is not currently possible to reset multiple jobs using wildcards or a
 * comma separated list.
 */
export const MlResetJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('The ID of the job to reset.').meta({ found_in: 'path' }),
  wait_for_completion: z.boolean().describe('Should this request wait until the operation has completed before returning.').optional().meta({ found_in: 'query' }),
  delete_user_annotations: z.boolean().describe('Specifies whether annotations that have been added by the user should be deleted along with any auto-generated annotations when the job is reset.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlResetJobRequest' })
export type MlResetJobRequest = z.infer<typeof MlResetJobRequest>

export const MlResetJobResponse = AcknowledgedResponseBase.meta({ id: 'MlResetJobResponse' })
export type MlResetJobResponse = z.infer<typeof MlResetJobResponse>
