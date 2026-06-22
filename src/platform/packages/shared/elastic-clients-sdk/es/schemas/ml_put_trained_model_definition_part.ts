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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

/** Create part of a trained model definition. */
export const MlPutTrainedModelDefinitionPartRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  part: integer.describe('The definition part number. When the definition is loaded for inference the definition parts are streamed in the order of their part number. The first part must be `0` and the final part must be `total_parts - 1`.').meta({ found_in: 'path' }),
  definition: z.string().describe('The definition part for the model. Must be a base64 encoded string.').meta({ found_in: 'body' }),
  total_definition_length: long.describe('The total uncompressed definition length in bytes. Not base64 encoded.').meta({ found_in: 'body' }),
  total_parts: integer.describe('The total number of parts that will be uploaded. Must be greater than 0.').meta({ found_in: 'body' })
}).meta({ id: 'MlPutTrainedModelDefinitionPartRequest' })
export type MlPutTrainedModelDefinitionPartRequest = z.infer<typeof MlPutTrainedModelDefinitionPartRequest>

export const MlPutTrainedModelDefinitionPartResponse = AcknowledgedResponseBase.meta({ id: 'MlPutTrainedModelDefinitionPartResponse' })
export type MlPutTrainedModelDefinitionPartResponse = z.infer<typeof MlPutTrainedModelDefinitionPartResponse>
