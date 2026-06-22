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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Set upgrade_mode for ML indices.
 *
 * Sets a cluster wide upgrade_mode setting that prepares machine learning
 * indices for an upgrade.
 * When upgrading your cluster, in some circumstances you must restart your
 * nodes and reindex your machine learning indices. In those circumstances,
 * there must be no machine learning jobs running. You can close the machine
 * learning jobs, do the upgrade, then open all the jobs again. Alternatively,
 * you can use this API to temporarily halt tasks associated with the jobs and
 * datafeeds and prevent new jobs from opening. You can also use this API
 * during upgrades that do not require you to reindex your machine learning
 * indices, though stopping jobs is not a requirement in that case.
 * You can see the current value for the upgrade_mode setting by using the get
 * machine learning info API.
 */
export const MlSetUpgradeModeRequest = z.object({
  ...RequestBase.shape,
  enabled: z.boolean().describe('When `true`, it enables `upgrade_mode` which temporarily halts all job and datafeed tasks and prohibits new job and datafeed tasks from starting.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The time to wait for the request to be completed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlSetUpgradeModeRequest' })
export type MlSetUpgradeModeRequest = z.infer<typeof MlSetUpgradeModeRequest>

export const MlSetUpgradeModeResponse = AcknowledgedResponseBase.meta({ id: 'MlSetUpgradeModeResponse' })
export type MlSetUpgradeModeResponse = z.infer<typeof MlSetUpgradeModeResponse>
