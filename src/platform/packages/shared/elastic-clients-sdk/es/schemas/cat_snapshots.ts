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
 * Some APIs will return values such as numbers also as a string (notably epoch timestamps). This behavior
 * is used to capture this behavior while keeping the semantics of the field type.
 *
 * Depending on the target language, code generators can keep the union or remove it and leniently parse
 * strings to the target type.
 */
export const SpecUtilsStringified = z.union([z.any(), z.string()]).meta({ id: 'SpecUtilsStringified' })
export type SpecUtilsStringified = z.infer<typeof SpecUtilsStringified>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Time of day, expressed as HH:MM:SS */
export const TimeOfDay = z.string().meta({ id: 'TimeOfDay' })
export type TimeOfDay = z.infer<typeof TimeOfDay>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatSnapshotsColumn = z.union([z.enum(['id', 'snapshot', 'repository', 're', 'repo', 'status', 's', 'start_epoch', 'ste', 'startEpoch', 'start_time', 'sti', 'startTime', 'end_epoch', 'ete', 'endEpoch', 'end_time', 'eti', 'endTime', 'duration', 'dur', 'indices', 'i', 'successful_shards', 'ss', 'failed_shards', 'fs', 'total_shards', 'ts', 'reason', 'r']), z.string()]).meta({ id: 'CatCatSnapshotsColumn' })
export type CatCatSnapshotsColumn = z.infer<typeof CatCatSnapshotsColumn>

export const CatCatSnapshotsColumns = z.union([CatCatSnapshotsColumn, z.array(CatCatSnapshotsColumn)]).meta({ id: 'CatCatSnapshotsColumns' })
export type CatCatSnapshotsColumns = z.infer<typeof CatCatSnapshotsColumns>

/**
 * Get snapshot information.
 *
 * Get information about the snapshots stored in one or more repositories.
 * A snapshot is a backup of an index or running Elasticsearch cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot API.
 */
export const CatSnapshotsRequest = z.object({
  ...CatCatRequestBase.shape,
  repository: Names.describe('A comma-separated list of snapshot repositories used to limit the request. Accepts wildcard expressions. `_all` returns all repositories. If any repository fails during the request, Elasticsearch returns an error.').optional().meta({ found_in: 'path' }),
  ignore_unavailable: z.boolean().describe('If `true`, the response does not include information from unavailable snapshots.').optional().meta({ found_in: 'query' }),
  h: CatCatSnapshotsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatSnapshotsRequest' })
export type CatSnapshotsRequest = z.infer<typeof CatSnapshotsRequest>

export const WatcherHourAndMinute = z.object({
  hour: z.array(integer),
  minute: z.array(integer)
}).meta({ id: 'WatcherHourAndMinute' })
export type WatcherHourAndMinute = z.infer<typeof WatcherHourAndMinute>

/** A time of day, expressed either as `hh:mm`, `noon`, `midnight`, or an hour/minutes structure. */
export const WatcherScheduleTimeOfDay = z.union([z.string(), WatcherHourAndMinute]).meta({ id: 'WatcherScheduleTimeOfDay' })
export type WatcherScheduleTimeOfDay = z.infer<typeof WatcherScheduleTimeOfDay>

export const CatSnapshotsSnapshotsRecord = z.object({
  id: z.string().describe('The unique identifier for the snapshot.').optional(),
  snapshot: z.string().describe('The unique identifier for the snapshot.').optional(),
  repository: z.string().describe('The repository name.').optional(),
  re: z.string().describe('The repository name.').optional(),
  repo: z.string().describe('The repository name.').optional(),
  status: z.string().describe('The state of the snapshot process. Returned values include: `FAILED`: The snapshot process failed. `INCOMPATIBLE`: The snapshot process is incompatible with the current cluster version. `IN_PROGRESS`: The snapshot process started but has not completed. `PARTIAL`: The snapshot process completed with a partial success. `SUCCESS`: The snapshot process completed with a full success.').optional(),
  s: z.string().describe('The state of the snapshot process. Returned values include: `FAILED`: The snapshot process failed. `INCOMPATIBLE`: The snapshot process is incompatible with the current cluster version. `IN_PROGRESS`: The snapshot process started but has not completed. `PARTIAL`: The snapshot process completed with a partial success. `SUCCESS`: The snapshot process completed with a full success.').optional(),
  start_epoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process started.').optional(),
  ste: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process started.').optional(),
  startEpoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process started.').optional(),
  start_time: WatcherScheduleTimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process started.').optional(),
  sti: WatcherScheduleTimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process started.').optional(),
  startTime: WatcherScheduleTimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process started.').optional(),
  end_epoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process ended.').optional(),
  ete: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process ended.').optional(),
  endEpoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process ended.').optional(),
  end_time: TimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process ended.').optional(),
  eti: TimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process ended.').optional(),
  endTime: TimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process ended.').optional(),
  duration: Duration.describe('The time it took the snapshot process to complete, in time units.').optional(),
  dur: Duration.describe('The time it took the snapshot process to complete, in time units.').optional(),
  indices: z.string().describe('The number of indices in the snapshot.').optional(),
  i: z.string().describe('The number of indices in the snapshot.').optional(),
  successful_shards: z.string().describe('The number of successful shards in the snapshot.').optional(),
  ss: z.string().describe('The number of successful shards in the snapshot.').optional(),
  failed_shards: z.string().describe('The number of failed shards in the snapshot.').optional(),
  fs: z.string().describe('The number of failed shards in the snapshot.').optional(),
  total_shards: z.string().describe('The total number of shards in the snapshot.').optional(),
  ts: z.string().describe('The total number of shards in the snapshot.').optional(),
  reason: z.string().describe('The reason for any snapshot failures.').optional(),
  r: z.string().describe('The reason for any snapshot failures.').optional()
}).meta({ id: 'CatSnapshotsSnapshotsRecord' })
export type CatSnapshotsSnapshotsRecord = z.infer<typeof CatSnapshotsSnapshotsRecord>

export const CatSnapshotsResponse = z.array(CatSnapshotsSnapshotsRecord).meta({ id: 'CatSnapshotsResponse' })
export type CatSnapshotsResponse = z.infer<typeof CatSnapshotsResponse>
