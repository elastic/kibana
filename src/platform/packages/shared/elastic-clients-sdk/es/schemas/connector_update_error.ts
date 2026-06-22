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
 * A `null` value that is to be interpreted as an actual value, unless other uses of `null` that are equivalent
 * to a missing value. It is used for exemple in settings, where using the `NullValue` for a setting will reset
 * it to its default value.
 */
export const SpecUtilsNullValue = z.null().meta({ id: 'SpecUtilsNullValue' })
export type SpecUtilsNullValue = z.infer<typeof SpecUtilsNullValue>

/**
 * `WithNullValue<T>` allows for explicit null assignments in contexts where `null` should be interpreted as an
 * actual value.
 */
export const SpecUtilsWithNullValue = z.union([z.any(), SpecUtilsNullValue]).meta({ id: 'SpecUtilsWithNullValue' })
export type SpecUtilsWithNullValue = z.infer<typeof SpecUtilsWithNullValue>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

/**
 * Update the connector error field.
 *
 * Set the error field for the connector.
 * If the error provided in the request body is non-null, the connector’s status is updated to error.
 * Otherwise, if the error is reset to null, the connector status is updated to connected.
 */
export const ConnectorUpdateErrorRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  error: SpecUtilsWithNullValue.meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdateErrorRequest' })
export type ConnectorUpdateErrorRequest = z.infer<typeof ConnectorUpdateErrorRequest>

export const ConnectorUpdateErrorResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateErrorResponse' })
export type ConnectorUpdateErrorResponse = z.infer<typeof ConnectorUpdateErrorResponse>
