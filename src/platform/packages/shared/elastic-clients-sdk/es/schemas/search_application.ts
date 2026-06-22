/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script, SearchResponseBody } from './_global.search'
import { AcknowledgedResponseBase, EpochTime, IndexName, Name, RequestBase, Result, integer, long } from './_types'

export const SearchApplicationEventDataStream = z.object({
  name: IndexName
}).meta({ id: 'SearchApplicationEventDataStream' })
export type SearchApplicationEventDataStream = z.infer<typeof SearchApplicationEventDataStream>

export const SearchApplicationAnalyticsCollection = z.object({
  event_data_stream: SearchApplicationEventDataStream.describe('Data stream for the collection.')
}).meta({ id: 'SearchApplicationAnalyticsCollection' })
export type SearchApplicationAnalyticsCollection = z.infer<typeof SearchApplicationAnalyticsCollection>

export const SearchApplicationEventType = z.enum(['page_view', 'search', 'search_click']).meta({ id: 'SearchApplicationEventType' })
export type SearchApplicationEventType = z.infer<typeof SearchApplicationEventType>

export const SearchApplicationSearchApplicationTemplate = z.object({
  script: z.lazy(() => Script).describe('The associated mustache template.')
}).meta({ id: 'SearchApplicationSearchApplicationTemplate' })
export type SearchApplicationSearchApplicationTemplate = z.infer<typeof SearchApplicationSearchApplicationTemplate>

export const SearchApplicationSearchApplicationParameters = z.object({
  indices: z.array(IndexName).describe('Indices that are part of the Search Application.'),
  analytics_collection_name: Name.describe('Analytics collection associated to the Search Application.').optional(),
  template: SearchApplicationSearchApplicationTemplate.describe('Search template to use on search operations.').optional()
}).meta({ id: 'SearchApplicationSearchApplicationParameters' })
export type SearchApplicationSearchApplicationParameters = z.infer<typeof SearchApplicationSearchApplicationParameters>

export const SearchApplicationSearchApplication = z.object({
  ...SearchApplicationSearchApplicationParameters.shape,
  name: Name.describe('Search Application name'),
  updated_at_millis: EpochTime.describe('Last time the Search Application was updated.')
}).meta({ id: 'SearchApplicationSearchApplication' })
export type SearchApplicationSearchApplication = z.infer<typeof SearchApplicationSearchApplication>

/**
 * Delete a search application.
 *
 * Remove a search application and its associated alias. Indices attached to the search application are not removed.
 */
export const SearchApplicationDeleteRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application to delete.').meta({ found_in: 'path' })
}).meta({ id: 'SearchApplicationDeleteRequest' })
export type SearchApplicationDeleteRequest = z.infer<typeof SearchApplicationDeleteRequest>

export const SearchApplicationDeleteResponse = AcknowledgedResponseBase.meta({ id: 'SearchApplicationDeleteResponse' })
export type SearchApplicationDeleteResponse = z.infer<typeof SearchApplicationDeleteResponse>

/**
 * Delete a behavioral analytics collection.
 *
 * The associated data stream is also deleted.
 * @deprecated
 */
export const SearchApplicationDeleteBehavioralAnalyticsRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the analytics collection to be deleted').meta({ found_in: 'path' })
}).meta({ id: 'SearchApplicationDeleteBehavioralAnalyticsRequest' })
export type SearchApplicationDeleteBehavioralAnalyticsRequest = z.infer<typeof SearchApplicationDeleteBehavioralAnalyticsRequest>

export const SearchApplicationDeleteBehavioralAnalyticsResponse = AcknowledgedResponseBase.meta({ id: 'SearchApplicationDeleteBehavioralAnalyticsResponse' })
export type SearchApplicationDeleteBehavioralAnalyticsResponse = z.infer<typeof SearchApplicationDeleteBehavioralAnalyticsResponse>

/** Get search application details. */
export const SearchApplicationGetRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application').meta({ found_in: 'path' })
}).meta({ id: 'SearchApplicationGetRequest' })
export type SearchApplicationGetRequest = z.infer<typeof SearchApplicationGetRequest>

export const SearchApplicationGetResponse = SearchApplicationSearchApplication.meta({ id: 'SearchApplicationGetResponse' })
export type SearchApplicationGetResponse = z.infer<typeof SearchApplicationGetResponse>

/**
 * Get behavioral analytics collections.
 * @deprecated
 */
export const SearchApplicationGetBehavioralAnalyticsRequest = z.object({
  ...RequestBase.shape,
  name: z.array(Name).describe('A list of analytics collections to limit the returned information').optional().meta({ found_in: 'path' })
}).meta({ id: 'SearchApplicationGetBehavioralAnalyticsRequest' })
export type SearchApplicationGetBehavioralAnalyticsRequest = z.infer<typeof SearchApplicationGetBehavioralAnalyticsRequest>

export const SearchApplicationGetBehavioralAnalyticsResponse = z.record(Name, SearchApplicationAnalyticsCollection).meta({ id: 'SearchApplicationGetBehavioralAnalyticsResponse' })
export type SearchApplicationGetBehavioralAnalyticsResponse = z.infer<typeof SearchApplicationGetBehavioralAnalyticsResponse>

/**
 * Get search applications.
 *
 * Get information about search applications.
 */
export const SearchApplicationListRequest = z.object({
  ...RequestBase.shape,
  q: z.string().describe('Query in the Lucene query string syntax.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Starting offset.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies a max number of results to get.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SearchApplicationListRequest' })
export type SearchApplicationListRequest = z.infer<typeof SearchApplicationListRequest>

export const SearchApplicationListResponse = z.object({
  count: long,
  results: z.array(SearchApplicationSearchApplication)
}).meta({ id: 'SearchApplicationListResponse' })
export type SearchApplicationListResponse = z.infer<typeof SearchApplicationListResponse>

/**
 * Create a behavioral analytics collection event.
 * @deprecated
 */
export const SearchApplicationPostBehavioralAnalyticsEventRequest = z.object({
  ...RequestBase.shape,
  collection_name: Name.describe('The name of the behavioral analytics collection.').meta({ found_in: 'path' }),
  event_type: SearchApplicationEventType.describe('The analytics event type.').meta({ found_in: 'path' }),
  debug: z.boolean().describe('Whether the response type has to include more details').optional().meta({ found_in: 'query' }),
  payload: z.any().optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchApplicationPostBehavioralAnalyticsEventRequest' })
export type SearchApplicationPostBehavioralAnalyticsEventRequest = z.infer<typeof SearchApplicationPostBehavioralAnalyticsEventRequest>

export const SearchApplicationPostBehavioralAnalyticsEventResponse = z.object({
  accepted: z.boolean(),
  event: z.any().optional()
}).meta({ id: 'SearchApplicationPostBehavioralAnalyticsEventResponse' })
export type SearchApplicationPostBehavioralAnalyticsEventResponse = z.infer<typeof SearchApplicationPostBehavioralAnalyticsEventResponse>

/** Create or update a search application. */
export const SearchApplicationPutRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application to be created or updated.').meta({ found_in: 'path' }),
  create: z.boolean().describe('If `true`, this request cannot replace or update existing Search Applications.').optional().meta({ found_in: 'query' }),
  search_application: SearchApplicationSearchApplicationParameters.optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchApplicationPutRequest' })
export type SearchApplicationPutRequest = z.infer<typeof SearchApplicationPutRequest>

export const SearchApplicationPutResponse = z.object({
  result: Result
}).meta({ id: 'SearchApplicationPutResponse' })
export type SearchApplicationPutResponse = z.infer<typeof SearchApplicationPutResponse>

export const SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase = z.object({
  ...AcknowledgedResponseBase.shape,
  name: Name.describe('The name of the analytics collection created or updated')
}).meta({ id: 'SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase' })
export type SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase = z.infer<typeof SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase>

/**
 * Create a behavioral analytics collection.
 * @deprecated
 */
export const SearchApplicationPutBehavioralAnalyticsRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the analytics collection to be created or updated.').meta({ found_in: 'path' })
}).meta({ id: 'SearchApplicationPutBehavioralAnalyticsRequest' })
export type SearchApplicationPutBehavioralAnalyticsRequest = z.infer<typeof SearchApplicationPutBehavioralAnalyticsRequest>

export const SearchApplicationPutBehavioralAnalyticsResponse = SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase.meta({ id: 'SearchApplicationPutBehavioralAnalyticsResponse' })
export type SearchApplicationPutBehavioralAnalyticsResponse = z.infer<typeof SearchApplicationPutBehavioralAnalyticsResponse>

/**
 * Render a search application query.
 *
 * Generate an Elasticsearch query using the specified query parameters and the search template associated with the search application or a default template if none is specified.
 * If a parameter used in the search template is not specified in `params`, the parameter's default value will be used.
 * The API returns the specific Elasticsearch query that would be generated and run by calling the search application search API.
 *
 * You must have `read` privileges on the backing alias of the search application.
 */
export const SearchApplicationRenderQueryRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application to render teh query for.').meta({ found_in: 'path' }),
  params: z.record(z.string(), z.any()).optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchApplicationRenderQueryRequest' })
export type SearchApplicationRenderQueryRequest = z.infer<typeof SearchApplicationRenderQueryRequest>

export const SearchApplicationRenderQueryResponse = z.object({
}).meta({ id: 'SearchApplicationRenderQueryResponse' })
export type SearchApplicationRenderQueryResponse = z.infer<typeof SearchApplicationRenderQueryResponse>

/**
 * Run a search application search.
 *
 * Generate and run an Elasticsearch query that uses the specified query parameteter and the search template associated with the search application or default template.
 * Unspecified template parameters are assigned their default values if applicable.
 */
export const SearchApplicationSearchRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application to be searched.').meta({ found_in: 'path' }),
  typed_keys: z.boolean().describe('Determines whether aggregation names are prefixed by their respective types in the response.').optional().meta({ found_in: 'query' }),
  params: z.record(z.string(), z.any()).describe('Query parameters specific to this request, which will override any defaults specified in the template.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchApplicationSearchRequest' })
export type SearchApplicationSearchRequest = z.infer<typeof SearchApplicationSearchRequest>

export const SearchApplicationSearchResponse = SearchResponseBody.meta({ id: 'SearchApplicationSearchResponse' })
export type SearchApplicationSearchResponse = z.infer<typeof SearchApplicationSearchResponse>
