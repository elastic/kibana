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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const SecurityUserProfileId = z.string().meta({ id: 'SecurityUserProfileId' })
export type SecurityUserProfileId = z.infer<typeof SecurityUserProfileId>

/**
 * Update user profile data.
 *
 * Update specific data for the user profile that is associated with a unique ID.
 *
 * NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
 * Individual users and external applications should not call this API directly.
 * Elastic reserves the right to change or remove this feature in future releases without prior notice.
 *
 * To use this API, you must have one of the following privileges:
 *
 * * The `manage_user_profile` cluster privilege.
 * * The `update_profile_data` global privilege for the namespaces that are referenced in the request.
 *
 * This API updates the `labels` and `data` fields of an existing user profile document with JSON objects.
 * New keys and their values are added to the profile document and conflicting keys are replaced by data that's included in the request.
 *
 * For both labels and data, content is namespaced by the top-level fields.
 * The `update_profile_data` global privilege grants privileges for updating only the allowed namespaces.
 */
export const SecurityUpdateUserProfileDataRequest = z.object({
  ...RequestBase.shape,
  uid: SecurityUserProfileId.describe('A unique identifier for the user profile.').meta({ found_in: 'path' }),
  if_seq_no: SequenceNumber.describe('Only perform the operation if the document has this sequence number.').optional().meta({ found_in: 'query' }),
  if_primary_term: long.describe('Only perform the operation if the document has this primary term.').optional().meta({ found_in: 'query' }),
  refresh: Refresh.describe('If \'true\', Elasticsearch refreshes the affected shards to make this operation visible to search. If \'wait_for\', it waits for a refresh to make this operation visible to search. If \'false\', nothing is done with refreshes.').optional().meta({ found_in: 'query' }),
  labels: z.record(z.string(), z.any()).describe('Searchable data that you want to associate with the user profile. This field supports a nested data structure. Within the labels object, top-level keys cannot begin with an underscore (`_`) or contain a period (`.`).').optional().meta({ found_in: 'body' }),
  data: z.record(z.string(), z.any()).describe('Non-searchable data that you want to associate with the user profile. This field supports a nested data structure. Within the `data` object, top-level keys cannot begin with an underscore (`_`) or contain a period (`.`). The data object is not searchable, but can be retrieved with the get user profile API.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SecurityUpdateUserProfileDataRequest' })
export type SecurityUpdateUserProfileDataRequest = z.infer<typeof SecurityUpdateUserProfileDataRequest>

export const SecurityUpdateUserProfileDataResponse = AcknowledgedResponseBase.meta({ id: 'SecurityUpdateUserProfileDataResponse' })
export type SecurityUpdateUserProfileDataResponse = z.infer<typeof SecurityUpdateUserProfileDataResponse>
