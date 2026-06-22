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

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Update voting configuration exclusions.
 *
 * Update the cluster voting config exclusions by node IDs or node names.
 * By default, if there are more than three master-eligible nodes in the cluster and you remove fewer than half of the master-eligible nodes in the cluster at once, the voting configuration automatically shrinks.
 * If you want to shrink the voting configuration to contain fewer than three nodes or to remove half or more of the master-eligible nodes in the cluster at once, use this API to remove departing nodes from the voting configuration manually.
 * The API adds an entry for each specified node to the cluster’s voting configuration exclusions list.
 * It then waits until the cluster has reconfigured its voting configuration to exclude the specified nodes.
 *
 * Clusters should have no voting configuration exclusions in normal operation.
 * Once the excluded nodes have stopped, clear the voting configuration exclusions with `DELETE /_cluster/voting_config_exclusions`.
 * This API waits for the nodes to be fully removed from the cluster before it returns.
 * If your cluster has voting configuration exclusions for nodes that you no longer intend to remove, use `DELETE /_cluster/voting_config_exclusions?wait_for_removal=false` to clear the voting configuration exclusions without waiting for the nodes to leave the cluster.
 *
 * A response to `POST /_cluster/voting_config_exclusions` with an HTTP status code of 200 OK guarantees that the node has been removed from the voting configuration and will not be reinstated until the voting configuration exclusions are cleared by calling `DELETE /_cluster/voting_config_exclusions`.
 * If the call to `POST /_cluster/voting_config_exclusions` fails or returns a response with an HTTP status code other than 200 OK then the node may not have been removed from the voting configuration.
 * In that case, you may safely retry the call.
 *
 * NOTE: Voting exclusions are required only when you remove at least half of the master-eligible nodes from a cluster in a short time period.
 * They are not required when removing master-ineligible nodes or when removing fewer than half of the master-eligible nodes.
 */
export const ClusterPostVotingConfigExclusionsRequest = z.object({
  ...RequestBase.shape,
  node_names: Names.describe('A comma-separated list of the names of the nodes to exclude from the voting configuration. If specified, you may not also specify node_ids.').optional().meta({ found_in: 'query' }),
  node_ids: Ids.describe('A comma-separated list of the persistent ids of the nodes to exclude from the voting configuration. If specified, you may not also specify node_names.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('When adding a voting configuration exclusion, the API waits for the specified nodes to be excluded from the voting configuration before returning. If the timeout expires before the appropriate condition is satisfied, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterPostVotingConfigExclusionsRequest' })
export type ClusterPostVotingConfigExclusionsRequest = z.infer<typeof ClusterPostVotingConfigExclusionsRequest>

export const ClusterPostVotingConfigExclusionsResponse = z.boolean().meta({ id: 'ClusterPostVotingConfigExclusionsResponse' })
export type ClusterPostVotingConfigExclusionsResponse = z.infer<typeof ClusterPostVotingConfigExclusionsResponse>
