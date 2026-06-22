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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const MlSnapshotUpgradeState = z.enum(['loading_old_state', 'saving_new_state', 'stopped', 'failed']).meta({ id: 'MlSnapshotUpgradeState' })
export type MlSnapshotUpgradeState = z.infer<typeof MlSnapshotUpgradeState>

export const MlModelSnapshotUpgrade = z.object({
  job_id: Id,
  snapshot_id: Id,
  state: MlSnapshotUpgradeState,
  assignment_explanation: z.string()
}).meta({ id: 'MlModelSnapshotUpgrade' })
export type MlModelSnapshotUpgrade = z.infer<typeof MlModelSnapshotUpgrade>

/** Get anomaly detection job model snapshot upgrade usage info. */
export const MlGetModelSnapshotUpgradeStatsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot. You can get information for multiple snapshots by using a comma-separated list or a wildcard expression. You can get all snapshots by using `_all`, by specifying `*` as the snapshot ID, or by omitting the snapshot ID.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request:  -  Contains wildcard expressions and there are no jobs that match.  -  Contains the _all string or no identifiers and there are no matches.  -  Contains wildcard expressions and there are only partial matches. The default value is true, which returns an empty jobs array when there are no matches and the subset of results when there are partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetModelSnapshotUpgradeStatsRequest' })
export type MlGetModelSnapshotUpgradeStatsRequest = z.infer<typeof MlGetModelSnapshotUpgradeStatsRequest>

export const MlGetModelSnapshotUpgradeStatsResponse = z.object({
  count: long,
  model_snapshot_upgrades: z.array(MlModelSnapshotUpgrade)
}).meta({ id: 'MlGetModelSnapshotUpgradeStatsResponse' })
export type MlGetModelSnapshotUpgradeStatsResponse = z.infer<typeof MlGetModelSnapshotUpgradeStatsResponse>
