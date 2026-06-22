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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Promote a data stream.
 *
 * Promote a data stream from a replicated data stream managed by cross-cluster replication (CCR) to a regular data stream.
 *
 * With CCR auto following, a data stream from a remote cluster can be replicated to the local cluster.
 * These data streams can't be rolled over in the local cluster.
 * These replicated data streams roll over only if the upstream data stream rolls over.
 * In the event that the remote cluster is no longer available, the data stream in the local cluster can be promoted to a regular data stream, which allows these data streams to be rolled over in the local cluster.
 *
 * NOTE: When promoting a data stream, ensure the local cluster has a data stream enabled index template that matches the data stream.
 * If this is missing, the data stream will not be able to roll over until a matching index template is created.
 * This will affect the lifecycle management of the data stream and interfere with the data stream size and retention.
 */
export const IndicesPromoteDataStreamRequest = z.object({
  ...RequestBase.shape,
  name: IndexName.describe('The name of the data stream to promote').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesPromoteDataStreamRequest' })
export type IndicesPromoteDataStreamRequest = z.infer<typeof IndicesPromoteDataStreamRequest>

export const IndicesPromoteDataStreamResponse = z.any().meta({ id: 'IndicesPromoteDataStreamResponse' })
export type IndicesPromoteDataStreamResponse = z.infer<typeof IndicesPromoteDataStreamResponse>
