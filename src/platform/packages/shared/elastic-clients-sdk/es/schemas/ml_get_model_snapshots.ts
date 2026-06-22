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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const MlCategorizationStatus = z.enum(['ok', 'warn']).meta({ id: 'MlCategorizationStatus' })
export type MlCategorizationStatus = z.infer<typeof MlCategorizationStatus>

export const MlMemoryStatus = z.enum(['ok', 'soft_limit', 'hard_limit']).meta({ id: 'MlMemoryStatus' })
export type MlMemoryStatus = z.infer<typeof MlMemoryStatus>

export const MlModelSizeStats = z.object({
  bucket_allocation_failures_count: long,
  job_id: Id,
  log_time: DateTime,
  memory_status: MlMemoryStatus,
  model_bytes: ByteSize,
  model_bytes_exceeded: ByteSize.optional(),
  model_bytes_memory_limit: ByteSize.optional(),
  output_memory_allocator_bytes: ByteSize.optional(),
  peak_model_bytes: ByteSize.optional(),
  assignment_memory_basis: z.string().optional(),
  result_type: z.string(),
  total_by_field_count: long,
  total_over_field_count: long,
  total_partition_field_count: long,
  categorization_status: MlCategorizationStatus,
  categorized_doc_count: integer,
  dead_category_count: integer,
  failed_category_count: integer,
  frequent_category_count: integer,
  rare_category_count: integer,
  total_category_count: integer,
  timestamp: long.optional()
}).meta({ id: 'MlModelSizeStats' })
export type MlModelSizeStats = z.infer<typeof MlModelSizeStats>

export const MlModelSnapshot = z.object({
  description: z.string().describe('An optional description of the job.').optional(),
  job_id: Id.describe('A numerical character string that uniquely identifies the job that the snapshot was created for.'),
  latest_record_time_stamp: integer.describe('The timestamp of the latest processed record.').optional(),
  latest_result_time_stamp: integer.describe('The timestamp of the latest bucket result.').optional(),
  min_version: VersionString.describe('The minimum version required to be able to restore the model snapshot.'),
  model_size_stats: MlModelSizeStats.describe('Summary information describing the model.').optional(),
  retain: z.boolean().describe('If true, this snapshot will not be deleted during automatic cleanup of snapshots older than model_snapshot_retention_days. However, this snapshot will be deleted when the job is deleted. The default value is false.'),
  snapshot_doc_count: long.describe('For internal use only.'),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot.'),
  timestamp: long.describe('The creation timestamp for the snapshot.')
}).meta({ id: 'MlModelSnapshot' })
export type MlModelSnapshot = z.infer<typeof MlModelSnapshot>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

/** Get model snapshots info. */
export const MlGetModelSnapshotsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot. You can get information for multiple snapshots by using a comma-separated list or a wildcard expression. You can get all snapshots by using `_all`, by specifying `*` as the snapshot ID, or by omitting the snapshot ID.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of snapshots.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of snapshots to obtain.').optional().meta({ found_in: 'query' }),
  desc: z.boolean().describe('Refer to the description for the `desc` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  page: MlPage.optional().meta({ found_in: 'body' }),
  sort: Field.describe('Refer to the description for the `sort` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetModelSnapshotsRequest' })
export type MlGetModelSnapshotsRequest = z.infer<typeof MlGetModelSnapshotsRequest>

export const MlGetModelSnapshotsResponse = z.object({
  count: long,
  model_snapshots: z.array(MlModelSnapshot)
}).meta({ id: 'MlGetModelSnapshotsResponse' })
export type MlGetModelSnapshotsResponse = z.infer<typeof MlGetModelSnapshotsResponse>
