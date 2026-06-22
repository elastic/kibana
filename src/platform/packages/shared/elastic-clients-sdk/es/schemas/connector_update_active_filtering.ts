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

/**
 * Activate the connector draft filter.
 *
 * Activates the valid draft filtering for a connector.
 */
export const ConnectorUpdateActiveFilteringRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' })
}).meta({ id: 'ConnectorUpdateActiveFilteringRequest' })
export type ConnectorUpdateActiveFilteringRequest = z.infer<typeof ConnectorUpdateActiveFilteringRequest>

export const ConnectorUpdateActiveFilteringResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateActiveFilteringResponse' })
export type ConnectorUpdateActiveFilteringResponse = z.infer<typeof ConnectorUpdateActiveFilteringResponse>
