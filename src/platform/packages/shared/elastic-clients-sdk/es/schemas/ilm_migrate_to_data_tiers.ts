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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Migrate to data tiers routing.
 *
 * Switch the indices, ILM policies, and legacy, composable, and component templates from using custom node attributes and attribute-based allocation filters to using data tiers.
 * Optionally, delete one legacy index template.
 * Using node roles enables ILM to automatically move the indices between data tiers.
 *
 * Migrating away from custom node attributes routing can be manually performed.
 * This API provides an automated way of performing three out of the four manual steps listed in the migration guide:
 *
 * 1. Stop setting the custom hot attribute on new indices.
 * 1. Remove custom allocation settings from existing ILM policies.
 * 1. Replace custom allocation settings from existing indices with the corresponding tier preference.
 *
 * ILM must be stopped before performing the migration.
 * Use the stop ILM and get ILM status APIs to wait until the reported operation mode is `STOPPED`.
 */
export const IlmMigrateToDataTiersRequest = z.object({
  ...RequestBase.shape,
  dry_run: z.boolean().describe('If true, simulates the migration from node attributes based allocation filters to data tiers, but does not perform the migration. This provides a way to retrieve the indices and ILM policies that need to be migrated.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  legacy_template_to_delete: z.string().optional().meta({ found_in: 'body' }),
  node_attribute: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'IlmMigrateToDataTiersRequest' })
export type IlmMigrateToDataTiersRequest = z.infer<typeof IlmMigrateToDataTiersRequest>

export const IlmMigrateToDataTiersResponse = z.object({
  dry_run: z.boolean(),
  removed_legacy_template: z.string().describe('The name of the legacy index template that was deleted. This information is missing if no legacy index templates were deleted.'),
  migrated_ilm_policies: z.array(z.string()).describe('The ILM policies that were updated.'),
  migrated_indices: Indices.describe('The indices that were migrated to tier preference routing.'),
  migrated_legacy_templates: z.array(z.string()).describe('The legacy index templates that were updated to not contain custom routing settings for the provided data attribute.'),
  migrated_composable_templates: z.array(z.string()).describe('The composable index templates that were updated to not contain custom routing settings for the provided data attribute.'),
  migrated_component_templates: z.array(z.string()).describe('The component templates that were updated to not contain custom routing settings for the provided data attribute.')
}).meta({ id: 'IlmMigrateToDataTiersResponse' })
export type IlmMigrateToDataTiersResponse = z.infer<typeof IlmMigrateToDataTiersResponse>
