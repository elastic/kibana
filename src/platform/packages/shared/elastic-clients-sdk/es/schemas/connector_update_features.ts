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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const ConnectorFeatureEnabled = z.object({
  enabled: z.boolean()
}).meta({ id: 'ConnectorFeatureEnabled' })
export type ConnectorFeatureEnabled = z.infer<typeof ConnectorFeatureEnabled>

export const ConnectorSyncRulesFeature = z.object({
  advanced: ConnectorFeatureEnabled.describe('Indicates whether advanced sync rules are enabled.').optional(),
  basic: ConnectorFeatureEnabled.describe('Indicates whether basic sync rules are enabled.').optional()
}).meta({ id: 'ConnectorSyncRulesFeature' })
export type ConnectorSyncRulesFeature = z.infer<typeof ConnectorSyncRulesFeature>

export const ConnectorConnectorFeatures = z.object({
  document_level_security: ConnectorFeatureEnabled.describe('Indicates whether document-level security is enabled.').optional(),
  incremental_sync: ConnectorFeatureEnabled.describe('Indicates whether incremental syncs are enabled.').optional(),
  native_connector_api_keys: ConnectorFeatureEnabled.describe('Indicates whether managed connector API keys are enabled.').optional(),
  sync_rules: ConnectorSyncRulesFeature.optional()
}).meta({ id: 'ConnectorConnectorFeatures' })
export type ConnectorConnectorFeatures = z.infer<typeof ConnectorConnectorFeatures>

/**
 * Update the connector features.
 *
 * Update the connector features in the connector document.
 * This API can be used to control the following aspects of a connector:
 *
 * * document-level security
 * * incremental syncs
 * * advanced sync rules
 * * basic sync rules
 *
 * Normally, the running connector service automatically manages these features.
 * However, you can use this API to override the default behavior.
 *
 * To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
 * This service runs automatically on Elastic Cloud for Elastic managed connectors.
 */
export const ConnectorUpdateFeaturesRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated.').meta({ found_in: 'path' }),
  features: ConnectorConnectorFeatures.meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdateFeaturesRequest' })
export type ConnectorUpdateFeaturesRequest = z.infer<typeof ConnectorUpdateFeaturesRequest>

export const ConnectorUpdateFeaturesResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdateFeaturesResponse' })
export type ConnectorUpdateFeaturesResponse = z.infer<typeof ConnectorUpdateFeaturesResponse>
