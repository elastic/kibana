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

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

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
