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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SearchApplicationEventType = z.enum(['page_view', 'search', 'search_click']).meta({ id: 'SearchApplicationEventType' })
export type SearchApplicationEventType = z.infer<typeof SearchApplicationEventType>

/**
 * Create a behavioral analytics collection event.
 * @deprecated
 */
export const SearchApplicationPostBehavioralAnalyticsEventRequest = z.object({
  ...RequestBase.shape,
  collection_name: Name.describe('The name of the behavioral analytics collection.').meta({ found_in: 'path' }),
  event_type: SearchApplicationEventType.describe('The analytics event type.').meta({ found_in: 'path' }),
  debug: z.boolean().describe('Whether the response type has to include more details').optional().meta({ found_in: 'query' }),
  payload: z.any().meta({ found_in: 'body' })
}).meta({ id: 'SearchApplicationPostBehavioralAnalyticsEventRequest' })
export type SearchApplicationPostBehavioralAnalyticsEventRequest = z.infer<typeof SearchApplicationPostBehavioralAnalyticsEventRequest>

export const SearchApplicationPostBehavioralAnalyticsEventResponse = z.object({
  accepted: z.boolean(),
  event: z.any().optional()
}).meta({ id: 'SearchApplicationPostBehavioralAnalyticsEventResponse' })
export type SearchApplicationPostBehavioralAnalyticsEventResponse = z.infer<typeof SearchApplicationPostBehavioralAnalyticsEventResponse>
