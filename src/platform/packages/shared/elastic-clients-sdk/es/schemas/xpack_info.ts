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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const LicenseLicenseStatus = z.enum(['active', 'valid', 'invalid', 'expired']).meta({ id: 'LicenseLicenseStatus' })
export type LicenseLicenseStatus = z.infer<typeof LicenseLicenseStatus>

export const LicenseLicenseType = z.enum(['missing', 'trial', 'basic', 'standard', 'dev', 'silver', 'gold', 'platinum', 'enterprise']).meta({ id: 'LicenseLicenseType' })
export type LicenseLicenseType = z.infer<typeof LicenseLicenseType>

export const XpackInfoBuildInformation = z.object({
  date: DateTime,
  hash: z.string()
}).meta({ id: 'XpackInfoBuildInformation' })
export type XpackInfoBuildInformation = z.infer<typeof XpackInfoBuildInformation>

export const XpackInfoNativeCodeInformation = z.object({
  build_hash: z.string(),
  version: VersionString
}).meta({ id: 'XpackInfoNativeCodeInformation' })
export type XpackInfoNativeCodeInformation = z.infer<typeof XpackInfoNativeCodeInformation>

export const XpackInfoFeature = z.object({
  available: z.boolean(),
  description: z.string().optional(),
  enabled: z.boolean(),
  native_code_info: XpackInfoNativeCodeInformation.optional()
}).meta({ id: 'XpackInfoFeature' })
export type XpackInfoFeature = z.infer<typeof XpackInfoFeature>

export const XpackInfoFeatures = z.object({
  aggregate_metric: XpackInfoFeature,
  analytics: XpackInfoFeature,
  ccr: XpackInfoFeature,
  data_streams: XpackInfoFeature,
  data_tiers: XpackInfoFeature,
  enrich: XpackInfoFeature,
  eql: XpackInfoFeature,
  graph: XpackInfoFeature,
  ilm: XpackInfoFeature,
  logstash: XpackInfoFeature,
  logsdb: XpackInfoFeature,
  ml: XpackInfoFeature,
  monitoring: XpackInfoFeature,
  rollup: XpackInfoFeature,
  runtime_fields: XpackInfoFeature.optional(),
  searchable_snapshots: XpackInfoFeature,
  security: XpackInfoFeature,
  slm: XpackInfoFeature,
  spatial: XpackInfoFeature,
  sql: XpackInfoFeature,
  transform: XpackInfoFeature,
  voting_only: XpackInfoFeature,
  watcher: XpackInfoFeature
}).meta({ id: 'XpackInfoFeatures' })
export type XpackInfoFeatures = z.infer<typeof XpackInfoFeatures>

export const XpackInfoMinimalLicenseInformation = z.object({
  expiry_date_in_millis: EpochTime,
  mode: LicenseLicenseType,
  status: LicenseLicenseStatus,
  type: LicenseLicenseType,
  uid: z.string()
}).meta({ id: 'XpackInfoMinimalLicenseInformation' })
export type XpackInfoMinimalLicenseInformation = z.infer<typeof XpackInfoMinimalLicenseInformation>

export const XpackInfoXPackCategory = z.enum(['build', 'features', 'license']).meta({ id: 'XpackInfoXPackCategory' })
export type XpackInfoXPackCategory = z.infer<typeof XpackInfoXPackCategory>

/**
 * Get information.
 *
 * The information provided by the API includes:
 *
 * * Build information including the build number and timestamp.
 * * License information about the currently installed license.
 * * Feature information for the features that are currently enabled and available under the current license.
 */
export const XpackInfoRequest = z.object({
  ...RequestBase.shape,
  categories: z.array(XpackInfoXPackCategory).describe('A comma-separated list of the information categories to include in the response. For example, `build,license,features`.').optional().meta({ found_in: 'query' }),
  accept_enterprise: z.boolean().describe('If used, this otherwise ignored parameter must be set to true').optional().meta({ found_in: 'query' }),
  human: z.boolean().describe('Defines whether additional human-readable information is included in the response. In particular, it adds descriptions and a tag line.').optional().meta({ found_in: 'query' })
}).meta({ id: 'XpackInfoRequest' })
export type XpackInfoRequest = z.infer<typeof XpackInfoRequest>

export const XpackInfoResponse = z.object({
  build: XpackInfoBuildInformation,
  features: XpackInfoFeatures,
  license: XpackInfoMinimalLicenseInformation,
  tagline: z.string()
}).meta({ id: 'XpackInfoResponse' })
export type XpackInfoResponse = z.infer<typeof XpackInfoResponse>
