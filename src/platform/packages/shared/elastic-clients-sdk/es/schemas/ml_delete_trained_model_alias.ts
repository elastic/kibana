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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete a trained model alias.
 *
 * This API deletes an existing model alias that refers to a trained model. If
 * the model alias is missing or refers to a model other than the one identified
 * by the `model_id`, this API returns an error.
 */
export const MlDeleteTrainedModelAliasRequest = z.object({
  ...RequestBase.shape,
  model_alias: Name.describe('The model alias to delete.').meta({ found_in: 'path' }),
  model_id: Id.describe('The trained model ID to which the model alias refers.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteTrainedModelAliasRequest' })
export type MlDeleteTrainedModelAliasRequest = z.infer<typeof MlDeleteTrainedModelAliasRequest>

export const MlDeleteTrainedModelAliasResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteTrainedModelAliasResponse' })
export type MlDeleteTrainedModelAliasResponse = z.infer<typeof MlDeleteTrainedModelAliasResponse>
