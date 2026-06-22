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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SecurityUserProfileId = z.string().meta({ id: 'SecurityUserProfileId' })
export type SecurityUserProfileId = z.infer<typeof SecurityUserProfileId>

/**
 * Enable a user profile.
 *
 * Enable user profiles to make them visible in user profile searches.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * When you activate a user profile, it's automatically enabled and visible in user profile searches.
 * If you later disable the user profile, you can use the enable user profile API to make the profile visible in these searches again.
 */
export const SecurityEnableUserProfileRequest = z.object({
  ...RequestBase.shape,
  uid: SecurityUserProfileId.describe('A unique identifier for the user profile.').meta({ found_in: 'path' }),
  refresh: Refresh.describe('If \'true\', Elasticsearch refreshes the affected shards to make this operation visible to search. If \'wait_for\', it waits for a refresh to make this operation visible to search. If \'false\', nothing is done with refreshes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SecurityEnableUserProfileRequest' })
export type SecurityEnableUserProfileRequest = z.infer<typeof SecurityEnableUserProfileRequest>

export const SecurityEnableUserProfileResponse = AcknowledgedResponseBase.meta({ id: 'SecurityEnableUserProfileResponse' })
export type SecurityEnableUserProfileResponse = z.infer<typeof SecurityEnableUserProfileResponse>
