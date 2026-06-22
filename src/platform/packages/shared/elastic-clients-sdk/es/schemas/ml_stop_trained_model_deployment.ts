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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Stop a trained model deployment. */
export const MlStopTrainedModelDeploymentRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  id: Id.describe('If provided, must be the same identifier as in the path.').optional().meta({ found_in: 'body' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: contains wildcard expressions and there are no deployments that match; contains the  `_all` string or no identifiers and there are no matches; or contains wildcard expressions and there are only partial matches. By default, it returns an empty array when there are no matches and the subset of results when there are partial matches. If `false`, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('Forcefully stops the deployment, even if it is used by ingest pipelines. You can\'t use these pipelines until you restart the model deployment.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStopTrainedModelDeploymentRequest' })
export type MlStopTrainedModelDeploymentRequest = z.infer<typeof MlStopTrainedModelDeploymentRequest>

export const MlStopTrainedModelDeploymentResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'MlStopTrainedModelDeploymentResponse' })
export type MlStopTrainedModelDeploymentResponse = z.infer<typeof MlStopTrainedModelDeploymentResponse>
