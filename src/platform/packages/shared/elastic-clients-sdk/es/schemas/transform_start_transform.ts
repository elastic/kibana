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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Start a transform.
 *
 * When you start a transform, it creates the destination index if it does not already exist. The `number_of_shards` is
 * set to `1` and the `auto_expand_replicas` is set to `0-1`. If it is a pivot transform, it deduces the mapping
 * definitions for the destination index from the source indices and the transform aggregations. If fields in the
 * destination index are derived from scripts (as in the case of `scripted_metric` or `bucket_script` aggregations),
 * the transform uses dynamic mappings unless an index template exists. If it is a latest transform, it does not deduce
 * mapping definitions; it uses dynamic mappings. To use explicit mappings, create the destination index before you
 * start the transform. Alternatively, you can create an index template, though it does not affect the deduced mappings
 * in a pivot transform.
 *
 * When the transform starts, a series of validations occur to ensure its success. If you deferred validation when you
 * created the transform, they occur when you start the transform—with the exception of privilege checks. When
 * Elasticsearch security features are enabled, the transform remembers which roles the user that created it had at the
 * time of creation and uses those same roles. If those roles do not have the required privileges on the source and
 * destination indices, the transform fails when it attempts unauthorized operations.
 */
export const TransformStartTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  from: z.string().describe('Restricts the set of transformed entities to those changed after this time. Relative times like now-30d are supported. Only applicable for continuous transforms.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformStartTransformRequest' })
export type TransformStartTransformRequest = z.infer<typeof TransformStartTransformRequest>

export const TransformStartTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformStartTransformResponse' })
export type TransformStartTransformResponse = z.infer<typeof TransformStartTransformResponse>
