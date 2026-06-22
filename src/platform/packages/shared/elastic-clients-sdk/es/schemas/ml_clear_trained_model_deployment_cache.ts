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

/**
 * Clear trained model deployment cache.
 *
 * Cache will be cleared on all nodes where the trained model is assigned.
 * A trained model deployment may have an inference cache enabled.
 * As requests are handled by each allocated node, their responses may be cached on that individual node.
 * Calling this API clears the caches without restarting the deployment.
 */
export const MlClearTrainedModelDeploymentCacheRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' })
}).meta({ id: 'MlClearTrainedModelDeploymentCacheRequest' })
export type MlClearTrainedModelDeploymentCacheRequest = z.infer<typeof MlClearTrainedModelDeploymentCacheRequest>

export const MlClearTrainedModelDeploymentCacheResponse = z.object({
  cleared: z.boolean()
}).meta({ id: 'MlClearTrainedModelDeploymentCacheResponse' })
export type MlClearTrainedModelDeploymentCacheResponse = z.infer<typeof MlClearTrainedModelDeploymentCacheResponse>
