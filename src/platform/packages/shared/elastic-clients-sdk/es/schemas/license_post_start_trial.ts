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
