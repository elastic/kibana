/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, DateTime, Duration, EpochTime, RequestBase, Uuid, integer, long } from './_types'

export const LicenseLicenseType = z.enum(['missing', 'trial', 'basic', 'standard', 'dev', 'silver', 'gold', 'platinum', 'enterprise']).meta({ id: 'LicenseLicenseType' })
export type LicenseLicenseType = z.infer<typeof LicenseLicenseType>

export const LicenseLicense = z.object({
  expiry_date_in_millis: EpochTime,
  issue_date_in_millis: EpochTime,
  start_date_in_millis: EpochTime.optional(),
  issued_to: z.string(),
  issuer: z.string(),
  max_nodes: z.union([long, z.null()]).optional(),
  max_resource_units: long.optional(),
  signature: z.string(),
  type: LicenseLicenseType,
  uid: z.string()
}).meta({ id: 'LicenseLicense' })
export type LicenseLicense = z.infer<typeof LicenseLicense>

export const LicenseLicenseStatus = z.enum(['active', 'valid', 'invalid', 'expired']).meta({ id: 'LicenseLicenseStatus' })
export type LicenseLicenseStatus = z.infer<typeof LicenseLicenseStatus>

/**
 * Delete the license.
 *
 * When the license expires, your subscription level reverts to Basic.
 *
 * If the operator privileges feature is enabled, only operator users can use this API.
 */
export const LicenseDeleteRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'LicenseDeleteRequest' })
export type LicenseDeleteRequest = z.infer<typeof LicenseDeleteRequest>

export const LicenseDeleteResponse = AcknowledgedResponseBase.meta({ id: 'LicenseDeleteResponse' })
export type LicenseDeleteResponse = z.infer<typeof LicenseDeleteResponse>

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

/** Get the basic license status. */
export const LicenseGetBasicStatusRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'LicenseGetBasicStatusRequest' })
export type LicenseGetBasicStatusRequest = z.infer<typeof LicenseGetBasicStatusRequest>

export const LicenseGetBasicStatusResponse = z.object({
  eligible_to_start_basic: z.boolean()
}).meta({ id: 'LicenseGetBasicStatusResponse' })
export type LicenseGetBasicStatusResponse = z.infer<typeof LicenseGetBasicStatusResponse>

/** Get the trial status. */
export const LicenseGetTrialStatusRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'LicenseGetTrialStatusRequest' })
export type LicenseGetTrialStatusRequest = z.infer<typeof LicenseGetTrialStatusRequest>

export const LicenseGetTrialStatusResponse = z.object({
  eligible_to_start_trial: z.boolean()
}).meta({ id: 'LicenseGetTrialStatusResponse' })
export type LicenseGetTrialStatusResponse = z.infer<typeof LicenseGetTrialStatusResponse>

export const LicensePostAcknowledgement = z.object({
  license: z.array(z.string()),
  message: z.string()
}).meta({ id: 'LicensePostAcknowledgement' })
export type LicensePostAcknowledgement = z.infer<typeof LicensePostAcknowledgement>

/**
 * Update the license.
 *
 * You can update your license at runtime without shutting down your nodes.
 * License updates take effect immediately.
 * If the license you are installing does not support all of the features that were available with your previous license, however, you are notified in the response.
 * You must then re-submit the API request with the acknowledge parameter set to true.
 *
 * NOTE: If Elasticsearch security features are enabled and you are installing a gold or higher license, you must enable TLS on the transport networking layer before you install the license.
 * If the operator privileges feature is enabled, only operator users can use this API.
 */
export const LicensePostRequest = z.object({
  ...RequestBase.shape,
  acknowledge: z.boolean().describe('To update a license, you must accept the acknowledge messages and set this parameter to `true`. In particular, if you are upgrading or downgrading a license, you must acknowlege the feature changes.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  license: LicenseLicense.optional().meta({ found_in: 'body' }),
  licenses: z.array(LicenseLicense).describe('A sequence of one or more JSON documents containing the license information.').optional().meta({ found_in: 'body' })
}).meta({ id: 'LicensePostRequest' })
export type LicensePostRequest = z.infer<typeof LicensePostRequest>

export const LicensePostResponse = z.object({
  acknowledge: LicensePostAcknowledgement.optional(),
  acknowledged: z.boolean(),
  license_status: LicenseLicenseStatus
}).meta({ id: 'LicensePostResponse' })
export type LicensePostResponse = z.infer<typeof LicensePostResponse>

/**
 * Start a basic license.
 *
 * Start an indefinite basic license, which gives access to all the basic features.
 *
 * NOTE: In order to start a basic license, you must not currently have a basic license.
 *
 * If the basic license does not support all of the features that are available with your current license, however, you are notified in the response.
 * You must then re-submit the API request with the `acknowledge` parameter set to `true`.
 *
 * To check the status of your basic license, use the get basic license API.
 */
export const LicensePostStartBasicRequest = z.object({
  ...RequestBase.shape,
  acknowledge: z.boolean().describe('To start a basic license, you must accept the acknowledge messages and set this parameter to `true`.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'LicensePostStartBasicRequest' })
export type LicensePostStartBasicRequest = z.infer<typeof LicensePostStartBasicRequest>

export const LicensePostStartBasicResponse = z.object({
  acknowledged: z.boolean(),
  basic_was_started: z.boolean(),
  error_message: z.string().optional(),
  type: LicenseLicenseType.optional(),
  acknowledge: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional()
}).meta({ id: 'LicensePostStartBasicResponse' })
export type LicensePostStartBasicResponse = z.infer<typeof LicensePostStartBasicResponse>

/**
 * Start a trial.
 *
 * Start a 30-day trial, which gives access to all subscription features.
 *
 * NOTE: You are allowed to start a trial only if your cluster has not already activated a trial for the current major product version.
 * For example, if you have already activated a trial for v8.0, you cannot start a new trial until v9.0. You can, however, request an extended trial at https://www.elastic.co/trialextension.
 *
 * To check the status of your trial, use the get trial status API.
 */
export const LicensePostStartTrialRequest = z.object({
  ...RequestBase.shape,
  acknowledge: z.boolean().describe('To start a trial, you must accept the acknowledge messages and set this parameter to `true`.').optional().meta({ found_in: 'query' }),
  type: z.string().describe('The type of trial license to generate').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'LicensePostStartTrialRequest' })
export type LicensePostStartTrialRequest = z.infer<typeof LicensePostStartTrialRequest>

export const LicensePostStartTrialResponse = z.object({
  acknowledged: z.boolean(),
  error_message: z.string().optional(),
  trial_was_started: z.boolean(),
  type: LicenseLicenseType.optional()
}).meta({ id: 'LicensePostStartTrialResponse' })
export type LicensePostStartTrialResponse = z.infer<typeof LicensePostStartTrialResponse>
