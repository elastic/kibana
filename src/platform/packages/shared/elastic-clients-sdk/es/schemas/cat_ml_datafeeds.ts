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

export const CatCatDatafeedColumn = z.enum(['ae', 'assignment_explanation', 'bc', 'buckets.count', 'bucketsCount', 'id', 'na', 'node.address', 'nodeAddress', 'ne', 'node.ephemeral_id', 'nodeEphemeralId', 'ni', 'node.id', 'nodeId', 'nn', 'node.name', 'nodeName', 'sba', 'search.bucket_avg', 'searchBucketAvg', 'sc', 'search.count', 'searchCount', 'seah', 'search.exp_avg_hour', 'searchExpAvgHour', 'st', 'search.time', 'searchTime', 's', 'state']).meta({ id: 'CatCatDatafeedColumn' })
export type CatCatDatafeedColumn = z.infer<typeof CatCatDatafeedColumn>

export const CatCatDatafeedColumns = z.union([CatCatDatafeedColumn, z.array(CatCatDatafeedColumn)]).meta({ id: 'CatCatDatafeedColumns' })
export type CatCatDatafeedColumns = z.infer<typeof CatCatDatafeedColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const MlDatafeedState = z.enum(['started', 'stopped', 'starting', 'stopping']).meta({ id: 'MlDatafeedState' })
export type MlDatafeedState = z.infer<typeof MlDatafeedState>

export const CatMlDatafeedsDatafeedsRecord = z.object({
  id: z.string().describe('The datafeed identifier.').optional(),
  state: MlDatafeedState.describe('The status of the datafeed.').optional(),
  s: MlDatafeedState.describe('The status of the datafeed.').optional(),
  assignment_explanation: z.string().describe('For started datafeeds only, contains messages relating to the selection of a node.').optional(),
  ae: z.string().describe('For started datafeeds only, contains messages relating to the selection of a node.').optional(),
  'buckets.count': z.string().describe('The number of buckets processed.').optional(),
  bc: z.string().describe('The number of buckets processed.').optional(),
  bucketsCount: z.string().describe('The number of buckets processed.').optional(),
  'search.count': z.string().describe('The number of searches run by the datafeed.').optional(),
  sc: z.string().describe('The number of searches run by the datafeed.').optional(),
  searchCount: z.string().describe('The number of searches run by the datafeed.').optional(),
  'search.time': z.string().describe('The total time the datafeed spent searching, in milliseconds.').optional(),
  st: z.string().describe('The total time the datafeed spent searching, in milliseconds.').optional(),
  searchTime: z.string().describe('The total time the datafeed spent searching, in milliseconds.').optional(),
  'search.bucket_avg': z.string().describe('The average search time per bucket, in milliseconds.').optional(),
  sba: z.string().describe('The average search time per bucket, in milliseconds.').optional(),
  searchBucketAvg: z.string().describe('The average search time per bucket, in milliseconds.').optional(),
  'search.exp_avg_hour': z.string().describe('The exponential average search time per hour, in milliseconds.').optional(),
  seah: z.string().describe('The exponential average search time per hour, in milliseconds.').optional(),
  searchExpAvgHour: z.string().describe('The exponential average search time per hour, in milliseconds.').optional(),
  'node.id': z.string().describe('The unique identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  ni: z.string().describe('The unique identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeId: z.string().describe('The unique identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  'node.name': z.string().describe('The name of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nn: z.string().describe('The name of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeName: z.string().describe('The name of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  'node.ephemeral_id': z.string().describe('The ephemeral identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  ne: z.string().describe('The ephemeral identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeEphemeralId: z.string().describe('The ephemeral identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  'node.address': z.string().describe('The network address of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  na: z.string().describe('The network address of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeAddress: z.string().describe('The network address of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional()
}).meta({ id: 'CatMlDatafeedsDatafeedsRecord' })
export type CatMlDatafeedsDatafeedsRecord = z.infer<typeof CatMlDatafeedsDatafeedsRecord>

/**
 * Get datafeeds.
 *
 * Get configuration and usage information about datafeeds.
 * This API returns a maximum of 10,000 datafeeds.
 * If the Elasticsearch security features are enabled, you must have `monitor_ml`, `monitor`, `manage_ml`, or `manage`
 * cluster privileges to use this API.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get datafeed statistics API.
 */
export const CatMlDatafeedsRequest = z.object({
  ...CatCatRequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: * Contains wildcard expressions and there are no datafeeds that match. * Contains the `_all` string or no identifiers and there are no matches. * Contains wildcard expressions and there are only partial matches. If `true`, the API returns an empty datafeeds array when there are no matches and the subset of results when there are partial matches. If `false`, the API returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  h: CatCatDatafeedColumns.describe('Comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatDatafeedColumns.describe('Comma-separated list of column names or column aliases used to sort the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMlDatafeedsRequest' })
export type CatMlDatafeedsRequest = z.infer<typeof CatMlDatafeedsRequest>

export const CatMlDatafeedsResponse = z.array(CatMlDatafeedsDatafeedsRecord).meta({ id: 'CatMlDatafeedsResponse' })
export type CatMlDatafeedsResponse = z.infer<typeof CatMlDatafeedsResponse>
