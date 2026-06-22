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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const NodesNodesResponseBase = z.object({
  node_stats: NodeStatistics.describe('Contains statistics about the number of nodes selected by the request’s node filters.').optional()
}).meta({ id: 'NodesNodesResponseBase' })
export type NodesNodesResponseBase = z.infer<typeof NodesNodesResponseBase>

export const NodesRepositoryLocation = z.object({
  base_path: z.string(),
  container: z.string().describe('Container name (Azure)').optional(),
  bucket: z.string().describe('Bucket name (GCP, S3)').optional()
}).meta({ id: 'NodesRepositoryLocation' })
export type NodesRepositoryLocation = z.infer<typeof NodesRepositoryLocation>

export const NodesRequestCounts = z.object({
  GetBlobProperties: long.describe('Number of Get Blob Properties requests (Azure)').optional(),
  GetBlob: long.describe('Number of Get Blob requests (Azure)').optional(),
  ListBlobs: long.describe('Number of List Blobs requests (Azure)').optional(),
  PutBlob: long.describe('Number of Put Blob requests (Azure)').optional(),
  PutBlock: long.describe('Number of Put Block (Azure)').optional(),
  PutBlockList: long.describe('Number of Put Block List requests').optional(),
  GetObject: long.describe('Number of get object requests (GCP, S3)').optional(),
  ListObjects: long.describe('Number of list objects requests (GCP, S3)').optional(),
  InsertObject: long.describe('Number of insert object requests, including simple, multipart and resumable uploads. Resumable uploads can perform multiple http requests to insert a single object but they are considered as a single request since they are billed as an individual operation. (GCP)').optional(),
  PutObject: long.describe('Number of PutObject requests (S3)').optional(),
  PutMultipartObject: long.describe('Number of Multipart requests, including CreateMultipartUpload, UploadPart and CompleteMultipartUpload requests (S3)').optional()
}).meta({ id: 'NodesRequestCounts' })
export type NodesRequestCounts = z.infer<typeof NodesRequestCounts>

export const NodesRepositoryMeteringInformation = z.object({
  repository_name: Name.describe('Repository name.'),
  repository_type: z.string().describe('Repository type.'),
  repository_location: NodesRepositoryLocation.describe('Represents an unique location within the repository.'),
  repository_ephemeral_id: Id.describe('An identifier that changes every time the repository is updated.'),
  repository_started_at: EpochTime.describe('Time the repository was created or updated. Recorded in milliseconds since the Unix Epoch.'),
  repository_stopped_at: EpochTime.describe('Time the repository was deleted or updated. Recorded in milliseconds since the Unix Epoch.').optional(),
  archived: z.boolean().describe('A flag that tells whether or not this object has been archived. When a repository is closed or updated the repository metering information is archived and kept for a certain period of time. This allows retrieving the repository metering information of previous repository instantiations.'),
  cluster_version: VersionNumber.describe('The cluster state version when this object was archived, this field can be used as a logical timestamp to delete all the archived metrics up to an observed version. This field is only present for archived repository metering information objects. The main purpose of this field is to avoid possible race conditions during repository metering information deletions, i.e. deleting archived repositories metering information that we haven’t observed yet.').optional(),
  request_counts: NodesRequestCounts.describe('An object with the number of request performed against the repository grouped by request type.')
}).meta({ id: 'NodesRepositoryMeteringInformation' })
export type NodesRepositoryMeteringInformation = z.infer<typeof NodesRepositoryMeteringInformation>

/**
 * Clear the archived repositories metering.
 *
 * Clear the archived repositories metering information in the cluster.
 */
export const NodesClearRepositoriesMeteringArchiveRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node IDs or names used to limit returned information.').meta({ found_in: 'path' }),
  max_archive_version: long.describe('Specifies the maximum `archive_version` to be cleared from the archive.').meta({ found_in: 'path' })
}).meta({ id: 'NodesClearRepositoriesMeteringArchiveRequest' })
export type NodesClearRepositoriesMeteringArchiveRequest = z.infer<typeof NodesClearRepositoriesMeteringArchiveRequest>

export const NodesClearRepositoriesMeteringArchiveResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.describe('Name of the cluster. Based on the `cluster.name` setting.'),
  nodes: z.record(z.string(), NodesRepositoryMeteringInformation).describe('Contains repositories metering information for the nodes selected by the request.')
}).meta({ id: 'NodesClearRepositoriesMeteringArchiveResponseBase' })
export type NodesClearRepositoriesMeteringArchiveResponseBase = z.infer<typeof NodesClearRepositoriesMeteringArchiveResponseBase>

export const NodesClearRepositoriesMeteringArchiveResponse = NodesClearRepositoriesMeteringArchiveResponseBase.meta({ id: 'NodesClearRepositoriesMeteringArchiveResponse' })
export type NodesClearRepositoriesMeteringArchiveResponse = z.infer<typeof NodesClearRepositoriesMeteringArchiveResponse>
