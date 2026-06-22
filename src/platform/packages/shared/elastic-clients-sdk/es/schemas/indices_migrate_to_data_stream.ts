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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Convert an index alias to a data stream.
 *
 * Converts an index alias to a data stream.
 * You must have a matching index template that is data stream enabled.
 * The alias must meet the following criteria:
 * The alias must have a write index;
 * All indices for the alias must have a `@timestamp` field mapping of a `date` or `date_nanos` field type;
 * The alias must not have any filters;
 * The alias must not use custom routing.
 * If successful, the request removes the alias and creates a data stream with the same name.
 * The indices for the alias become hidden backing indices for the stream.
 * The write index for the alias becomes the write index for the stream.
 */
export const IndicesMigrateToDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: IndexName.describe('Name of the index alias to convert to a data stream.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesMigrateToDataStreamRequest' })
export type IndicesMigrateToDataStreamRequest = z.infer<typeof IndicesMigrateToDataStreamRequest>

export const IndicesMigrateToDataStreamResponse = AcknowledgedResponseBase.meta({ id: 'IndicesMigrateToDataStreamResponse' })
export type IndicesMigrateToDataStreamResponse = z.infer<typeof IndicesMigrateToDataStreamResponse>
