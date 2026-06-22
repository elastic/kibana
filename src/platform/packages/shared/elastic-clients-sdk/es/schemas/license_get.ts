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

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const LicenseLicenseStatus = z.enum(['active', 'valid', 'invalid', 'expired']).meta({ id: 'LicenseLicenseStatus' })
export type LicenseLicenseStatus = z.infer<typeof LicenseLicenseStatus>

export const LicenseLicenseType = z.enum(['missing', 'trial', 'basic', 'standard', 'dev', 'silver', 'gold', 'platinum', 'enterprise']).meta({ id: 'LicenseLicenseType' })
export type LicenseLicenseType = z.infer<typeof LicenseLicenseType>

export const LicenseGetLicenseInformation = z.object({
  expiry_date: DateTime.describe('The date and time the license expires in ISO 8601 format.').optional(),
  expiry_date_in_millis: EpochTime.describe('The date and time the license expires in milliseconds since the Unix epoch.').optional(),
  issue_date: DateTime.describe('The date and time the license was issued in ISO 8601 format.'),
  issue_date_in_millis: EpochTime.describe('The date and time the license was issued in milliseconds since the Unix epoch.'),
  issued_to: z.string().describe('The name of the customer or organization that received the license.'),
  issuer: z.string().describe('The name of the organization that issued the license.'),
  max_nodes: z.union([long, z.null()]).describe('The maximum number of nodes the license allows.'),
  max_resource_units: z.union([integer, z.null()]).describe('The maximum number of resource units the license allows (for enterprise licenses only).').optional(),
  status: LicenseLicenseStatus.describe('The status of the license. For example,active, valid, invalid, or expired.'),
  type: LicenseLicenseType.describe('The type of the license. For example, trial, basic, gold, platinum, or enterprise.'),
  uid: Uuid.describe('The unique identifier of the license.'),
  start_date_in_millis: EpochTime.describe('The date and time the license was started in milliseconds since the Unix epoch.')
}).meta({ id: 'LicenseGetLicenseInformation' })
export type LicenseGetLicenseInformation = z.infer<typeof LicenseGetLicenseInformation>

/**
 * Get license information.
 *
 * Get information about your Elastic license including its type, its status, when it was issued, and when it expires.
 *
 * >info
 * > If the master node is generating a new cluster state, the get license API may return a `404 Not Found` response.
 * > If you receive an unexpected 404 response after cluster startup, wait a short period and retry the request.
 */
export const LicenseGetRequest = z.object({
  ...RequestBase.shape,
  accept_enterprise: z.boolean().describe('If `true`, this parameter returns enterprise for Enterprise license types. If `false`, this parameter returns platinum for both platinum and enterprise license types. This behavior is maintained for backwards compatibility. This parameter is deprecated and will always be set to true in 8.x.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('Specifies whether to retrieve local information. From 9.2 onwards the default value is `true`, which means the information is retrieved from the responding node. In earlier versions the default is `false`, which means the information is retrieved from the elected master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'LicenseGetRequest' })
export type LicenseGetRequest = z.infer<typeof LicenseGetRequest>

export const LicenseGetResponse = z.object({
  license: LicenseGetLicenseInformation
}).meta({ id: 'LicenseGetResponse' })
export type LicenseGetResponse = z.infer<typeof LicenseGetResponse>
