/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, RequestBase } from './_types'

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

/**
 * Reset the features.
 *
 * Clear all of the state information stored in system indices by Elasticsearch features, including the security and machine learning indices.
 *
 * WARNING: Intended for development and testing use only. Do not reset features on a production cluster.
 *
 * Return a cluster to the same state as a new installation by resetting the feature state for all Elasticsearch features.
 * This deletes all state information stored in system indices.
 *
 * The response code is HTTP 200 if the state is successfully reset for all features.
 * It is HTTP 500 if the reset operation failed for any feature.
 *
 * Note that select features might provide a way to reset particular system indices.
 * Using this API resets all features, both those that are built-in and implemented as plugins.
 *
 * To list the features that will be affected, use the get features API.
 *
 * IMPORTANT: The features installed on the node you submit this request to are the features that will be reset. Run on the master node if you have any doubts about which plugins are installed on individual nodes.
 */
export const FeaturesResetFeaturesRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'FeaturesResetFeaturesRequest' })
export type FeaturesResetFeaturesRequest = z.infer<typeof FeaturesResetFeaturesRequest>

export const FeaturesResetFeaturesResponse = z.object({
  features: z.array(FeaturesFeature)
}).meta({ id: 'FeaturesResetFeaturesResponse' })
export type FeaturesResetFeaturesResponse = z.infer<typeof FeaturesResetFeaturesResponse>
