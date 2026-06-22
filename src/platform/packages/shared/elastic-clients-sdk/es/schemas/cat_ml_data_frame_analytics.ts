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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const CatCatDfaColumn = z.enum(['assignment_explanation', 'ae', 'create_time', 'ct', 'createTime', 'description', 'd', 'dest_index', 'di', 'destIndex', 'failure_reason', 'fr', 'failureReason', 'id', 'model_memory_limit', 'mml', 'modelMemoryLimit', 'node.address', 'na', 'nodeAddress', 'node.ephemeral_id', 'ne', 'nodeEphemeralId', 'node.id', 'ni', 'nodeId', 'node.name', 'nn', 'nodeName', 'progress', 'p', 'source_index', 'si', 'sourceIndex', 'state', 's', 'type', 't', 'version', 'v']).meta({ id: 'CatCatDfaColumn' })
export type CatCatDfaColumn = z.infer<typeof CatCatDfaColumn>

export const CatCatDfaColumns = z.union([CatCatDfaColumn, z.array(CatCatDfaColumn)]).meta({ id: 'CatCatDfaColumns' })
export type CatCatDfaColumns = z.infer<typeof CatCatDfaColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatMlDataFrameAnalyticsDataFrameAnalyticsRecord = z.object({
  id: Id.describe('The identifier for the job.').optional(),
  type: z.string().describe('The type of analysis that the job performs.').optional(),
  t: z.string().describe('The type of analysis that the job performs.').optional(),
  create_time: z.string().describe('The time when the job was created.').optional(),
  ct: z.string().describe('The time when the job was created.').optional(),
  createTime: z.string().describe('The time when the job was created.').optional(),
  version: VersionString.describe('The version of Elasticsearch when the job was created.').optional(),
  v: VersionString.describe('The version of Elasticsearch when the job was created.').optional(),
  source_index: IndexName.describe('The name of the source index.').optional(),
  si: IndexName.describe('The name of the source index.').optional(),
  sourceIndex: IndexName.describe('The name of the source index.').optional(),
  dest_index: IndexName.describe('The name of the destination index.').optional(),
  di: IndexName.describe('The name of the destination index.').optional(),
  destIndex: IndexName.describe('The name of the destination index.').optional(),
  description: z.string().describe('A description of the job.').optional(),
  d: z.string().describe('A description of the job.').optional(),
  model_memory_limit: z.string().describe('The approximate maximum amount of memory resources that are permitted for the job.').optional(),
  mml: z.string().describe('The approximate maximum amount of memory resources that are permitted for the job.').optional(),
  modelMemoryLimit: z.string().describe('The approximate maximum amount of memory resources that are permitted for the job.').optional(),
  state: z.string().describe('The current status of the job.').optional(),
  s: z.string().describe('The current status of the job.').optional(),
  failure_reason: z.string().describe('Messages about the reason why the job failed.').optional(),
  fr: z.string().describe('Messages about the reason why the job failed.').optional(),
  failureReason: z.string().describe('Messages about the reason why the job failed.').optional(),
  progress: z.string().describe('The progress report for the job by phase.').optional(),
  p: z.string().describe('The progress report for the job by phase.').optional(),
  assignment_explanation: z.string().describe('Messages related to the selection of a node.').optional(),
  ae: z.string().describe('Messages related to the selection of a node.').optional(),
  assignmentExplanation: z.string().describe('Messages related to the selection of a node.').optional(),
  'node.id': Id.describe('The unique identifier of the assigned node.').optional(),
  ni: Id.describe('The unique identifier of the assigned node.').optional(),
  nodeId: Id.describe('The unique identifier of the assigned node.').optional(),
  'node.name': Name.describe('The name of the assigned node.').optional(),
  nn: Name.describe('The name of the assigned node.').optional(),
  nodeName: Name.describe('The name of the assigned node.').optional(),
  'node.ephemeral_id': Id.describe('The ephemeral identifier of the assigned node.').optional(),
  ne: Id.describe('The ephemeral identifier of the assigned node.').optional(),
  nodeEphemeralId: Id.describe('The ephemeral identifier of the assigned node.').optional(),
  'node.address': z.string().describe('The network address of the assigned node.').optional(),
  na: z.string().describe('The network address of the assigned node.').optional(),
  nodeAddress: z.string().describe('The network address of the assigned node.').optional()
}).meta({ id: 'CatMlDataFrameAnalyticsDataFrameAnalyticsRecord' })
export type CatMlDataFrameAnalyticsDataFrameAnalyticsRecord = z.infer<typeof CatMlDataFrameAnalyticsDataFrameAnalyticsRecord>

/**
 * Get data frame analytics jobs.
 *
 * Get configuration and usage information about data frame analytics jobs.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get data frame analytics jobs statistics API.
 */
export const CatMlDataFrameAnalyticsRequest = z.object({
  ...CatCatRequestBase.shape,
  id: Id.describe('The ID of the data frame analytics to fetch').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Whether to ignore if a wildcard expression matches no configs. (This includes `_all` string or when no configs have been specified.)').optional().meta({ found_in: 'query' }),
  h: CatCatDfaColumns.describe('Comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatDfaColumns.describe('Comma-separated list of column names or column aliases used to sort the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMlDataFrameAnalyticsRequest' })
export type CatMlDataFrameAnalyticsRequest = z.infer<typeof CatMlDataFrameAnalyticsRequest>

export const CatMlDataFrameAnalyticsResponse = z.array(CatMlDataFrameAnalyticsDataFrameAnalyticsRecord).meta({ id: 'CatMlDataFrameAnalyticsResponse' })
export type CatMlDataFrameAnalyticsResponse = z.infer<typeof CatMlDataFrameAnalyticsResponse>
