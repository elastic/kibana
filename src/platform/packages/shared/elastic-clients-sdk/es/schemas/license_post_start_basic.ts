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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const LicenseLicenseType = z.enum(['missing', 'trial', 'basic', 'standard', 'dev', 'silver', 'gold', 'platinum', 'enterprise']).meta({ id: 'LicenseLicenseType' })
export type LicenseLicenseType = z.infer<typeof LicenseLicenseType>

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
