/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ErrorCause, IndexName, RequestBase, VersionString } from './_types'

export const MigrationDeprecationsDeprecationLevel = z.enum(['none', 'info', 'warning', 'critical']).meta({ id: 'MigrationDeprecationsDeprecationLevel' })
export type MigrationDeprecationsDeprecationLevel = z.infer<typeof MigrationDeprecationsDeprecationLevel>

export const MigrationDeprecationsDeprecation = z.object({
  details: z.string().describe('Optional details about the deprecation warning.').optional(),
  level: MigrationDeprecationsDeprecationLevel.describe('The level property describes the significance of the issue.'),
  message: z.string().describe('Descriptive information about the deprecation warning.'),
  url: z.string().describe('A link to the breaking change documentation, where you can find more information about this change.'),
  resolve_during_rolling_upgrade: z.boolean(),
  _meta: z.record(z.string(), z.any()).optional()
}).meta({ id: 'MigrationDeprecationsDeprecation' })
export type MigrationDeprecationsDeprecation = z.infer<typeof MigrationDeprecationsDeprecation>

/**
 * Get deprecation information.
 *
 * Returns information about deprecated features which are in use in the cluster.
 * The reported features include cluster, node, and index level settings that will be removed or changed in the next major version.
 * You must address the reported issues before upgrading to the next major version.
 * However, no action is required when upgrading within the current major version.
 * Deprecated features remain fully supported and will continue to work in the current version, and when upgrading to a newer minor or patch release in the same major version.
 * Use this API to review your usage of these features and migrate away from them at your own pace, before upgrading to a new major version.
 *
 * > info
 * > This API is designed for indirect use by the [Upgrade Assistant](https://www.elastic.co/docs/deploy-manage/upgrade/prepare-to-upgrade/upgrade-assistant).
 * > We recommend learning about deprecated features using the Upgrade Assistant rather than calling this API directly.
 */
export const MigrationDeprecationsRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Comma-separate list of data streams or indices to check. Wildcard (*) expressions are supported.').optional().meta({ found_in: 'path' })
}).meta({ id: 'MigrationDeprecationsRequest' })
export type MigrationDeprecationsRequest = z.infer<typeof MigrationDeprecationsRequest>

export const MigrationDeprecationsResponse = z.object({
  cluster_settings: z.array(MigrationDeprecationsDeprecation).describe('Cluster-level deprecation warnings.'),
  index_settings: z.record(z.string(), z.array(MigrationDeprecationsDeprecation)).describe('Index warnings are sectioned off per index and can be filtered using an index-pattern in the query. This section includes warnings for the backing indices of data streams specified in the request path.'),
  data_streams: z.record(z.string(), z.array(MigrationDeprecationsDeprecation)),
  node_settings: z.array(MigrationDeprecationsDeprecation).describe('Node-level deprecation warnings. Since only a subset of your nodes might incorporate these settings, it is important to read the details section for more information about which nodes are affected.'),
  ml_settings: z.array(MigrationDeprecationsDeprecation).describe('Machine learning-related deprecation warnings.'),
  templates: z.record(z.string(), z.array(MigrationDeprecationsDeprecation)).describe('Template warnings are sectioned off per template and include deprecations for both component templates and index templates.'),
  ilm_policies: z.record(z.string(), z.array(MigrationDeprecationsDeprecation)).describe('ILM policy warnings are sectioned off per policy.')
}).meta({ id: 'MigrationDeprecationsResponse' })
export type MigrationDeprecationsResponse = z.infer<typeof MigrationDeprecationsResponse>

export const MigrationGetFeatureUpgradeStatusMigrationStatus = z.enum(['NO_MIGRATION_NEEDED', 'MIGRATION_NEEDED', 'IN_PROGRESS', 'ERROR']).meta({ id: 'MigrationGetFeatureUpgradeStatusMigrationStatus' })
export type MigrationGetFeatureUpgradeStatusMigrationStatus = z.infer<typeof MigrationGetFeatureUpgradeStatusMigrationStatus>

export const MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo = z.object({
  index: IndexName,
  version: VersionString,
  failure_cause: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo' })
export type MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo = z.infer<typeof MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo>

export const MigrationGetFeatureUpgradeStatusMigrationFeature = z.object({
  feature_name: z.string(),
  minimum_index_version: VersionString,
  migration_status: MigrationGetFeatureUpgradeStatusMigrationStatus,
  indices: z.array(MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo)
}).meta({ id: 'MigrationGetFeatureUpgradeStatusMigrationFeature' })
export type MigrationGetFeatureUpgradeStatusMigrationFeature = z.infer<typeof MigrationGetFeatureUpgradeStatusMigrationFeature>

/**
 * Get feature migration information.
 *
 * Version upgrades sometimes require changes to how features store configuration information and data in system indices.
 * Check which features need to be migrated and the status of any migrations that are in progress.
 *
 * TIP: This API is designed for indirect use by the Upgrade Assistant.
 * You are strongly recommended to use the Upgrade Assistant.
 */
export const MigrationGetFeatureUpgradeStatusRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'MigrationGetFeatureUpgradeStatusRequest' })
export type MigrationGetFeatureUpgradeStatusRequest = z.infer<typeof MigrationGetFeatureUpgradeStatusRequest>

export const MigrationGetFeatureUpgradeStatusResponse = z.object({
  features: z.array(MigrationGetFeatureUpgradeStatusMigrationFeature),
  migration_status: MigrationGetFeatureUpgradeStatusMigrationStatus
}).meta({ id: 'MigrationGetFeatureUpgradeStatusResponse' })
export type MigrationGetFeatureUpgradeStatusResponse = z.infer<typeof MigrationGetFeatureUpgradeStatusResponse>

export const MigrationPostFeatureUpgradeMigrationFeature = z.object({
  feature_name: z.string()
}).meta({ id: 'MigrationPostFeatureUpgradeMigrationFeature' })
export type MigrationPostFeatureUpgradeMigrationFeature = z.infer<typeof MigrationPostFeatureUpgradeMigrationFeature>

/**
 * Start the feature migration.
 *
 * Version upgrades sometimes require changes to how features store configuration information and data in system indices.
 * This API starts the automatic migration process.
 *
 * Some functionality might be temporarily unavailable during the migration process.
 *
 * TIP: The API is designed for indirect use by the Upgrade Assistant. We strongly recommend you use the Upgrade Assistant.
 */
export const MigrationPostFeatureUpgradeRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'MigrationPostFeatureUpgradeRequest' })
export type MigrationPostFeatureUpgradeRequest = z.infer<typeof MigrationPostFeatureUpgradeRequest>

export const MigrationPostFeatureUpgradeResponse = z.object({
  accepted: z.boolean(),
  features: z.array(MigrationPostFeatureUpgradeMigrationFeature).optional(),
  reason: z.string().optional()
}).meta({ id: 'MigrationPostFeatureUpgradeResponse' })
export type MigrationPostFeatureUpgradeResponse = z.infer<typeof MigrationPostFeatureUpgradeResponse>
