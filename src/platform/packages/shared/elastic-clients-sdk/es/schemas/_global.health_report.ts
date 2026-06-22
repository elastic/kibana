/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, IndexName, Indices, LifecycleOperationMode, RequestBase, integer, long } from './_types'

export const HealthReportIndicatorHealthStatus = z.enum(['green', 'yellow', 'red', 'unknown', 'unavailable']).meta({ id: 'HealthReportIndicatorHealthStatus' })
export type HealthReportIndicatorHealthStatus = z.infer<typeof HealthReportIndicatorHealthStatus>

export const HealthReportImpactArea = z.enum(['search', 'ingest', 'backup', 'deployment_management']).meta({ id: 'HealthReportImpactArea' })
export type HealthReportImpactArea = z.infer<typeof HealthReportImpactArea>

export const HealthReportImpact = z.object({
  description: z.string(),
  id: z.string(),
  impact_areas: z.array(HealthReportImpactArea),
  severity: integer
}).meta({ id: 'HealthReportImpact' })
export type HealthReportImpact = z.infer<typeof HealthReportImpact>

export const HealthReportIndicatorNode = z.object({
  name: z.union([z.string(), z.null()]),
  node_id: z.union([z.string(), z.null()])
}).meta({ id: 'HealthReportIndicatorNode' })
export type HealthReportIndicatorNode = z.infer<typeof HealthReportIndicatorNode>

export const HealthReportDiagnosisAffectedResources = z.object({
  indices: Indices.optional(),
  nodes: z.array(HealthReportIndicatorNode).optional(),
  slm_policies: z.array(z.string()).optional(),
  feature_states: z.array(z.string()).optional(),
  snapshot_repositories: z.array(z.string()).optional()
}).meta({ id: 'HealthReportDiagnosisAffectedResources' })
export type HealthReportDiagnosisAffectedResources = z.infer<typeof HealthReportDiagnosisAffectedResources>

export const HealthReportDiagnosis = z.object({
  id: z.string(),
  action: z.string(),
  affected_resources: HealthReportDiagnosisAffectedResources,
  cause: z.string(),
  help_url: z.string()
}).meta({ id: 'HealthReportDiagnosis' })
export type HealthReportDiagnosis = z.infer<typeof HealthReportDiagnosis>

export const HealthReportBaseIndicator = z.object({
  status: HealthReportIndicatorHealthStatus,
  symptom: z.string(),
  impacts: z.array(HealthReportImpact).optional(),
  diagnosis: z.array(HealthReportDiagnosis).optional()
}).meta({ id: 'HealthReportBaseIndicator' })
export type HealthReportBaseIndicator = z.infer<typeof HealthReportBaseIndicator>

export const HealthReportStagnatingBackingIndices = z.object({
  index_name: IndexName,
  first_occurrence_timestamp: long,
  retry_count: integer
}).meta({ id: 'HealthReportStagnatingBackingIndices' })
export type HealthReportStagnatingBackingIndices = z.infer<typeof HealthReportStagnatingBackingIndices>

export const HealthReportDataStreamLifecycleDetails = z.object({
  stagnating_backing_indices_count: integer,
  total_backing_indices_in_error: integer,
  stagnating_backing_indices: z.array(HealthReportStagnatingBackingIndices).optional()
}).meta({ id: 'HealthReportDataStreamLifecycleDetails' })
export type HealthReportDataStreamLifecycleDetails = z.infer<typeof HealthReportDataStreamLifecycleDetails>

/** DATA_STREAM_LIFECYCLE */
export const HealthReportDataStreamLifecycleIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportDataStreamLifecycleDetails.optional()
}).meta({ id: 'HealthReportDataStreamLifecycleIndicator' })
export type HealthReportDataStreamLifecycleIndicator = z.infer<typeof HealthReportDataStreamLifecycleIndicator>

export const HealthReportDiskIndicatorDetails = z.object({
  indices_with_readonly_block: long,
  nodes_with_enough_disk_space: long,
  nodes_over_high_watermark: long,
  nodes_over_flood_stage_watermark: long,
  nodes_with_unknown_disk_status: long
}).meta({ id: 'HealthReportDiskIndicatorDetails' })
export type HealthReportDiskIndicatorDetails = z.infer<typeof HealthReportDiskIndicatorDetails>

/** DISK */
export const HealthReportDiskIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportDiskIndicatorDetails.optional()
}).meta({ id: 'HealthReportDiskIndicator' })
export type HealthReportDiskIndicator = z.infer<typeof HealthReportDiskIndicator>

export const HealthReportFileSettingsIndicatorDetails = z.object({
  failure_streak: long,
  most_recent_failure: z.string()
}).meta({ id: 'HealthReportFileSettingsIndicatorDetails' })
export type HealthReportFileSettingsIndicatorDetails = z.infer<typeof HealthReportFileSettingsIndicatorDetails>

/** FILE_SETTINGS */
export const HealthReportFileSettingsIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportFileSettingsIndicatorDetails.optional()
}).meta({ id: 'HealthReportFileSettingsIndicator' })
export type HealthReportFileSettingsIndicator = z.infer<typeof HealthReportFileSettingsIndicator>

export const HealthReportIlmIndicatorDetails = z.object({
  ilm_status: LifecycleOperationMode,
  policies: long,
  stagnating_indices: integer
}).meta({ id: 'HealthReportIlmIndicatorDetails' })
export type HealthReportIlmIndicatorDetails = z.infer<typeof HealthReportIlmIndicatorDetails>

/** ILM */
export const HealthReportIlmIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportIlmIndicatorDetails.optional()
}).meta({ id: 'HealthReportIlmIndicator' })
export type HealthReportIlmIndicator = z.infer<typeof HealthReportIlmIndicator>

export const HealthReportMasterIsStableIndicatorExceptionFetchingHistory = z.object({
  message: z.string(),
  stack_trace: z.string()
}).meta({ id: 'HealthReportMasterIsStableIndicatorExceptionFetchingHistory' })
export type HealthReportMasterIsStableIndicatorExceptionFetchingHistory = z.infer<typeof HealthReportMasterIsStableIndicatorExceptionFetchingHistory>

export const HealthReportMasterIsStableIndicatorClusterFormationNode = z.object({
  name: z.string().optional(),
  node_id: z.string(),
  cluster_formation_message: z.string()
}).meta({ id: 'HealthReportMasterIsStableIndicatorClusterFormationNode' })
export type HealthReportMasterIsStableIndicatorClusterFormationNode = z.infer<typeof HealthReportMasterIsStableIndicatorClusterFormationNode>

export const HealthReportMasterIsStableIndicatorDetails = z.object({
  current_master: HealthReportIndicatorNode,
  recent_masters: z.array(HealthReportIndicatorNode),
  exception_fetching_history: HealthReportMasterIsStableIndicatorExceptionFetchingHistory.optional(),
  cluster_formation: z.array(HealthReportMasterIsStableIndicatorClusterFormationNode).optional()
}).meta({ id: 'HealthReportMasterIsStableIndicatorDetails' })
export type HealthReportMasterIsStableIndicatorDetails = z.infer<typeof HealthReportMasterIsStableIndicatorDetails>

/** MASTER_IS_STABLE */
export const HealthReportMasterIsStableIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportMasterIsStableIndicatorDetails.optional()
}).meta({ id: 'HealthReportMasterIsStableIndicator' })
export type HealthReportMasterIsStableIndicator = z.infer<typeof HealthReportMasterIsStableIndicator>

export const HealthReportShardsAvailabilityIndicatorDetails = z.object({
  creating_primaries: long,
  creating_replicas: long,
  initializing_primaries: long,
  initializing_replicas: long,
  restarting_primaries: long,
  restarting_replicas: long,
  started_primaries: long,
  started_replicas: long,
  unassigned_primaries: long,
  unassigned_replicas: long
}).meta({ id: 'HealthReportShardsAvailabilityIndicatorDetails' })
export type HealthReportShardsAvailabilityIndicatorDetails = z.infer<typeof HealthReportShardsAvailabilityIndicatorDetails>

/** SHARDS_AVAILABILITY */
export const HealthReportShardsAvailabilityIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportShardsAvailabilityIndicatorDetails.optional()
}).meta({ id: 'HealthReportShardsAvailabilityIndicator' })
export type HealthReportShardsAvailabilityIndicator = z.infer<typeof HealthReportShardsAvailabilityIndicator>

export const HealthReportRepositoryIntegrityIndicatorDetails = z.object({
  total_repositories: long.optional(),
  corrupted_repositories: long.optional(),
  corrupted: z.array(z.string()).optional()
}).meta({ id: 'HealthReportRepositoryIntegrityIndicatorDetails' })
export type HealthReportRepositoryIntegrityIndicatorDetails = z.infer<typeof HealthReportRepositoryIntegrityIndicatorDetails>

/** REPOSITORY_INTEGRITY */
export const HealthReportRepositoryIntegrityIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportRepositoryIntegrityIndicatorDetails.optional()
}).meta({ id: 'HealthReportRepositoryIntegrityIndicator' })
export type HealthReportRepositoryIntegrityIndicator = z.infer<typeof HealthReportRepositoryIntegrityIndicator>

export const HealthReportSlmIndicatorUnhealthyPolicies = z.object({
  count: long,
  invocations_since_last_success: z.record(z.string(), long).optional()
}).meta({ id: 'HealthReportSlmIndicatorUnhealthyPolicies' })
export type HealthReportSlmIndicatorUnhealthyPolicies = z.infer<typeof HealthReportSlmIndicatorUnhealthyPolicies>

export const HealthReportSlmIndicatorDetails = z.object({
  slm_status: LifecycleOperationMode,
  policies: long,
  unhealthy_policies: HealthReportSlmIndicatorUnhealthyPolicies.optional()
}).meta({ id: 'HealthReportSlmIndicatorDetails' })
export type HealthReportSlmIndicatorDetails = z.infer<typeof HealthReportSlmIndicatorDetails>

/** SLM */
export const HealthReportSlmIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportSlmIndicatorDetails.optional()
}).meta({ id: 'HealthReportSlmIndicator' })
export type HealthReportSlmIndicator = z.infer<typeof HealthReportSlmIndicator>

export const HealthReportShardsCapacityIndicatorTierDetail = z.object({
  max_shards_in_cluster: integer,
  current_used_shards: integer.optional()
}).meta({ id: 'HealthReportShardsCapacityIndicatorTierDetail' })
export type HealthReportShardsCapacityIndicatorTierDetail = z.infer<typeof HealthReportShardsCapacityIndicatorTierDetail>

export const HealthReportShardsCapacityIndicatorDetails = z.object({
  data: HealthReportShardsCapacityIndicatorTierDetail,
  frozen: HealthReportShardsCapacityIndicatorTierDetail
}).meta({ id: 'HealthReportShardsCapacityIndicatorDetails' })
export type HealthReportShardsCapacityIndicatorDetails = z.infer<typeof HealthReportShardsCapacityIndicatorDetails>

/** SHARDS_CAPACITY */
export const HealthReportShardsCapacityIndicator = z.object({
  ...HealthReportBaseIndicator.shape,
  details: HealthReportShardsCapacityIndicatorDetails.optional()
}).meta({ id: 'HealthReportShardsCapacityIndicator' })
export type HealthReportShardsCapacityIndicator = z.infer<typeof HealthReportShardsCapacityIndicator>

export const HealthReportIndicators = z.object({
  master_is_stable: HealthReportMasterIsStableIndicator.optional(),
  shards_availability: HealthReportShardsAvailabilityIndicator.optional(),
  disk: HealthReportDiskIndicator.optional(),
  repository_integrity: HealthReportRepositoryIntegrityIndicator.optional(),
  data_stream_lifecycle: HealthReportDataStreamLifecycleIndicator.optional(),
  ilm: HealthReportIlmIndicator.optional(),
  slm: HealthReportSlmIndicator.optional(),
  shards_capacity: HealthReportShardsCapacityIndicator.optional(),
  file_settings: HealthReportFileSettingsIndicator.optional()
}).meta({ id: 'HealthReportIndicators' })
export type HealthReportIndicators = z.infer<typeof HealthReportIndicators>

/**
 * Get the cluster health.
 *
 * Get a report with the health status of an Elasticsearch cluster.
 * The report contains a list of indicators that compose Elasticsearch functionality.
 *
 * Each indicator has a health status of: green, unknown, yellow or red.
 * The indicator will provide an explanation and metadata describing the reason for its current health status.
 *
 * The cluster’s status is controlled by the worst indicator status.
 *
 * In the event that an indicator’s status is non-green, a list of impacts may be present in the indicator result which detail the functionalities that are negatively affected by the health issue.
 * Each impact carries with it a severity level, an area of the system that is affected, and a simple description of the impact on the system.
 *
 * Some health indicators can determine the root cause of a health problem and prescribe a set of steps that can be performed in order to improve the health of the system.
 * The root cause and remediation steps are encapsulated in a diagnosis.
 * A diagnosis contains a cause detailing a root cause analysis, an action containing a brief description of the steps to take to fix the problem, the list of affected resources (if applicable), and a detailed step-by-step troubleshooting guide to fix the diagnosed problem.
 *
 * NOTE: The health indicators perform root cause analysis of non-green health statuses. This can be computationally expensive when called frequently.
 * When setting up automated polling of the API for health status, set verbose to false to disable the more expensive analysis logic.
 */
export const HealthReportRequest = z.object({
  ...RequestBase.shape,
  feature: z.union([z.string(), z.array(z.string())]).describe('A feature of the cluster, as returned by the top-level health report API.').optional().meta({ found_in: 'path' }),
  timeout: Duration.describe('Explicit operation timeout.').optional().meta({ found_in: 'query' }),
  verbose: z.boolean().describe('Opt-in for more information about the health of the system.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Limit the number of affected resources the health report API returns.').optional().meta({ found_in: 'query' })
}).meta({ id: 'HealthReportRequest' })
export type HealthReportRequest = z.infer<typeof HealthReportRequest>

export const HealthReportResponse = z.object({
  cluster_name: z.string(),
  indicators: HealthReportIndicators,
  status: HealthReportIndicatorHealthStatus.optional()
}).meta({ id: 'HealthReportResponse' })
export type HealthReportResponse = z.infer<typeof HealthReportResponse>
