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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Stop transforms.
 *
 * Stops one or more transforms.
 */
export const TransformStopTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Name.describe('Identifier for the transform. To stop multiple transforms, use a comma-separated list or a wildcard expression. To stop all transforms, use `_all` or `*` as the identifier.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: contains wildcard expressions and there are no transforms that match; contains the `_all` string or no identifiers and there are no matches; contains wildcard expressions and there are only partial matches. If it is true, the API returns a successful acknowledgement message when there are no matches. When there are only partial matches, the API stops the appropriate transforms. If it is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  force: z.boolean().describe('If it is true, the API forcefully stops the transforms.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response when `wait_for_completion` is `true`. If no response is received before the timeout expires, the request returns a timeout exception. However, the request continues processing and eventually moves the transform to a STOPPED state.').optional().meta({ found_in: 'query' }),
  wait_for_checkpoint: z.boolean().describe('If it is true, the transform does not completely stop until the current checkpoint is completed. If it is false, the transform stops as soon as possible.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If it is true, the API blocks until the indexer state completely stops. If it is false, the API returns immediately and the indexer is stopped asynchronously in the background.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformStopTransformRequest' })
export type TransformStopTransformRequest = z.infer<typeof TransformStopTransformRequest>

export const TransformStopTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformStopTransformResponse' })
export type TransformStopTransformResponse = z.infer<typeof TransformStopTransformResponse>
