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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const StreamResult = z.instanceof(ArrayBuffer).meta({ id: 'StreamResult' })
export type StreamResult = z.infer<typeof StreamResult>

export const InferenceTaskSettings = z.any().meta({ id: 'InferenceTaskSettings' })
export type InferenceTaskSettings = z.infer<typeof InferenceTaskSettings>

/**
 * Perform streaming completion inference on the service.
 *
 * Get real-time responses for completion tasks by delivering answers incrementally, reducing response times during computation.
 * This API works only with the completion task type.
 *
 * IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 *
 * This API requires the `monitor_inference` cluster privilege (the built-in `inference_admin` and `inference_user` roles grant this privilege). You must use a client that supports streaming.
 */
export const InferenceStreamCompletionRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The unique identifier for the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('The text on which you want to perform the inference task. It can be a single string or an array. NOTE: Inference endpoints for the completion task type currently only support a single string as input.').meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceStreamCompletionRequest' })
export type InferenceStreamCompletionRequest = z.infer<typeof InferenceStreamCompletionRequest>

export const InferenceStreamCompletionResponse = StreamResult.meta({ id: 'InferenceStreamCompletionResponse' })
export type InferenceStreamCompletionResponse = z.infer<typeof InferenceStreamCompletionResponse>
