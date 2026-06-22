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

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

/**
 * Create a trained model vocabulary.
 *
 * This API is supported only for natural language processing (NLP) models.
 * The vocabulary is stored in the index as described in `inference_config.*.vocabulary` of the trained model definition.
 */
export const MlPutTrainedModelVocabularyRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  vocabulary: z.array(z.string()).describe('The model vocabulary, which must not be empty.').meta({ found_in: 'body' }),
  merges: z.array(z.string()).describe('The optional model merges if required by the tokenizer.').optional().meta({ found_in: 'body' }),
  scores: z.array(double).describe('The optional vocabulary value scores if required by the tokenizer.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutTrainedModelVocabularyRequest' })
export type MlPutTrainedModelVocabularyRequest = z.infer<typeof MlPutTrainedModelVocabularyRequest>

export const MlPutTrainedModelVocabularyResponse = AcknowledgedResponseBase.meta({ id: 'MlPutTrainedModelVocabularyResponse' })
export type MlPutTrainedModelVocabularyResponse = z.infer<typeof MlPutTrainedModelVocabularyResponse>
