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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Upgrade a snapshot.
 *
 * Upgrade an anomaly detection model snapshot to the latest major version.
 * Over time, older snapshot formats are deprecated and removed. Anomaly
 * detection jobs support only snapshots that are from the current or previous
 * major version.
 * This API provides a means to upgrade a snapshot to the current major version.
 * This aids in preparing the cluster for an upgrade to the next major version.
 * Only one snapshot per anomaly detection job can be upgraded at a time and the
 * upgraded snapshot cannot be the current snapshot of the anomaly detection
 * job.
 */
export const MlUpgradeJobSnapshotRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot.').meta({ found_in: 'path' }),
  wait_for_completion: z.boolean().describe('When true, the API won’t respond until the upgrade is complete. Otherwise, it responds as soon as the upgrade task is assigned to a node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Controls the time to wait for the request to complete.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlUpgradeJobSnapshotRequest' })
export type MlUpgradeJobSnapshotRequest = z.infer<typeof MlUpgradeJobSnapshotRequest>

export const MlUpgradeJobSnapshotResponse = z.object({
  node: NodeId.describe('The ID of the node that the upgrade task was started on if it is still running. In serverless this will be the "serverless".'),
  completed: z.boolean().describe('When true, this means the task is complete. When false, it is still running.')
}).meta({ id: 'MlUpgradeJobSnapshotResponse' })
export type MlUpgradeJobSnapshotResponse = z.infer<typeof MlUpgradeJobSnapshotResponse>
