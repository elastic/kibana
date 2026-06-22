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

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

/** Update the connector is_native flag. */
export const ConnectorUpdateNativeRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  is_native: z.boolean().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdateNativeRequest' })
export type ConnectorUpdateNativeRequest = z.infer<typeof ConnectorUpdateNativeRequest>

export const ConnectorUpdateNativeResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateNativeResponse' })
export type ConnectorUpdateNativeResponse = z.infer<typeof ConnectorUpdateNativeResponse>
