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

/**
 * Update the cluster settings.
 *
 * Configure and update dynamic settings on a running cluster.
 * You can also configure dynamic settings locally on an unstarted or shut down node in `elasticsearch.yml`.
 *
 * Updates made with this API can be persistent, which apply across cluster restarts, or transient, which reset after a cluster restart.
 * You can also reset transient or persistent settings by assigning them a null value.
 *
 * If you configure the same setting using multiple methods, Elasticsearch applies the settings in following order of precedence: 1) Transient setting; 2) Persistent setting; 3) `elasticsearch.yml` setting; 4) Default setting value.
 * For example, you can apply a transient setting to override a persistent setting or `elasticsearch.yml` setting.
 * However, a change to an `elasticsearch.yml` setting will not override a defined transient or persistent setting.
 *
 * TIP: In Elastic Cloud, use the user settings feature to configure all cluster settings. This method automatically rejects unsafe settings that could break your cluster.
 * If you run Elasticsearch on your own hardware, use this API to configure dynamic cluster settings.
 * Only use `elasticsearch.yml` for static cluster settings and node settings.
 * The API doesn’t require a restart and ensures a setting’s value is the same on all nodes.
 *
 * WARNING: Transient cluster settings are no longer recommended. Use persistent cluster settings instead.
 * If a cluster becomes unstable, transient settings can clear unexpectedly, resulting in a potentially undesired cluster configuration.
 */
export const ClusterPutSettingsRequest = z.object({
  ...RequestBase.shape,
  flat_settings: z.boolean().describe('Return settings in flat format').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response.').optional().meta({ found_in: 'query' }),
  persistent: z.record(z.string(), z.any()).describe('The settings that persist after the cluster restarts.').optional().meta({ found_in: 'body' }),
  transient: z.record(z.string(), z.any()).describe('The settings that do not persist after the cluster restarts.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterPutSettingsRequest' })
export type ClusterPutSettingsRequest = z.infer<typeof ClusterPutSettingsRequest>

export const ClusterPutSettingsResponse = z.object({
  acknowledged: z.boolean(),
  persistent: z.record(z.string(), z.any()),
  transient: z.record(z.string(), z.any())
}).meta({ id: 'ClusterPutSettingsResponse' })
export type ClusterPutSettingsResponse = z.infer<typeof ClusterPutSettingsResponse>
