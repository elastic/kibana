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
 * Create or update a trained model alias.
 *
 * A trained model alias is a logical name used to reference a single trained
 * model.
 * You can use aliases instead of trained model identifiers to make it easier to
 * reference your models. For example, you can use aliases in inference
 * aggregations and processors.
 * An alias must be unique and refer to only a single trained model. However,
 * you can have multiple aliases for each trained model.
 * If you use this API to update an alias such that it references a different
 * trained model ID and the model uses a different type of data frame analytics,
 * an error occurs. For example, this situation occurs if you have a trained
 * model for regression analysis and a trained model for classification
 * analysis; you cannot reassign an alias from one type of trained model to
 * another.
 * If you use this API to update an alias and there are very few input fields in
 * common between the old and new trained models for the model alias, the API
 * returns a warning.
 */
export const MlPutTrainedModelAliasRequest = z.object({
  ...RequestBase.shape,
  model_alias: Name.describe('The alias to create or update. This value cannot end in numbers.').meta({ found_in: 'path' }),
  model_id: Id.describe('The identifier for the trained model that the alias refers to.').meta({ found_in: 'path' }),
  reassign: z.boolean().describe('Specifies whether the alias gets reassigned to the specified trained model if it is already assigned to a different model. If the alias is already assigned and this parameter is false, the API returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlPutTrainedModelAliasRequest' })
export type MlPutTrainedModelAliasRequest = z.infer<typeof MlPutTrainedModelAliasRequest>

export const MlPutTrainedModelAliasResponse = AcknowledgedResponseBase.meta({ id: 'MlPutTrainedModelAliasResponse' })
export type MlPutTrainedModelAliasResponse = z.infer<typeof MlPutTrainedModelAliasResponse>
