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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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
