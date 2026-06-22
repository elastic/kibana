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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/**
 * Upgrade all transforms.
 *
 * Transforms are compatible across minor versions and between supported major versions.
 * However, over time, the format of transform configuration information may change.
 * This API identifies transforms that have a legacy configuration format and upgrades them to the latest version.
 * It also cleans up the internal data structures that store the transform state and checkpoints.
 * The upgrade does not affect the source and destination indices.
 * The upgrade also does not affect the roles that transforms use when Elasticsearch security features are enabled; the role used to read source data and write to the destination index remains unchanged.
 *
 * If a transform upgrade step fails, the upgrade stops and an error is returned about the underlying issue.
 * Resolve the issue then re-run the process again.
 * A summary is returned when the upgrade is finished.
 *
 * To ensure continuous transforms remain running during a major version upgrade of the cluster – for example, from 7.16 to 8.0 – it is recommended to upgrade transforms before upgrading the cluster.
 * You may want to perform a recent cluster backup prior to the upgrade.
 */
export const TransformUpgradeTransformsRequest = z.object({
  ...RequestBase.shape,
  dry_run: z.boolean().describe('When true, the request checks for updates but does not run them.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformUpgradeTransformsRequest' })
export type TransformUpgradeTransformsRequest = z.infer<typeof TransformUpgradeTransformsRequest>

export const TransformUpgradeTransformsResponse = z.object({
  needs_update: integer.describe('The number of transforms that need to be upgraded.'),
  no_action: integer.describe('The number of transforms that don’t require upgrading.'),
  updated: integer.describe('The number of transforms that have been upgraded.')
}).meta({ id: 'TransformUpgradeTransformsResponse' })
export type TransformUpgradeTransformsResponse = z.infer<typeof TransformUpgradeTransformsResponse>
