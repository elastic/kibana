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

export const FeaturesFeature = z.object({
  name: z.string(),
  description: z.string()
}).meta({ id: 'FeaturesFeature' })
export type FeaturesFeature = z.infer<typeof FeaturesFeature>

/**
 * Get the features.
 *
 * Get a list of features that can be included in snapshots using the `feature_states` field when creating a snapshot.
 * You can use this API to determine which feature states to include when taking a snapshot.
 * By default, all feature states are included in a snapshot if that snapshot includes the global state, or none if it does not.
 *
 * A feature state includes one or more system indices necessary for a given feature to function.
 * In order to ensure data integrity, all system indices that comprise a feature state are snapshotted and restored together.
 *
 * The features listed by this API are a combination of built-in features and features defined by plugins.
 * In order for a feature state to be listed in this API and recognized as a valid feature state by the create snapshot API, the plugin that defines that feature must be installed on the master node.
 */
export const FeaturesGetFeaturesRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'FeaturesGetFeaturesRequest' })
export type FeaturesGetFeaturesRequest = z.infer<typeof FeaturesGetFeaturesRequest>

export const FeaturesGetFeaturesResponse = z.object({
  features: z.array(FeaturesFeature)
}).meta({ id: 'FeaturesGetFeaturesResponse' })
export type FeaturesGetFeaturesResponse = z.infer<typeof FeaturesGetFeaturesResponse>
