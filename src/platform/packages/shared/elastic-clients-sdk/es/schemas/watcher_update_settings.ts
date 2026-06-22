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
 * Update Watcher index settings.
 *
 * Update settings for the Watcher internal index (`.watches`).
 * Only a subset of settings can be modified.
 * This includes `index.auto_expand_replicas`, `index.number_of_replicas`, `index.routing.allocation.exclude.*`,
 * `index.routing.allocation.include.*` and `index.routing.allocation.require.*`.
 * Modification of `index.routing.allocation.include._tier_preference` is an exception and is not allowed as the
 * Watcher shards must always be in the `data_content` tier.
 */
export const WatcherUpdateSettingsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  'index.auto_expand_replicas': z.string().optional(),
  'index.number_of_replicas': integer.optional()
}).meta({ id: 'WatcherUpdateSettingsRequest' })
export type WatcherUpdateSettingsRequest = z.infer<typeof WatcherUpdateSettingsRequest>

export const WatcherUpdateSettingsResponse = z.object({
  acknowledged: z.boolean()
}).meta({ id: 'WatcherUpdateSettingsResponse' })
export type WatcherUpdateSettingsResponse = z.infer<typeof WatcherUpdateSettingsResponse>
