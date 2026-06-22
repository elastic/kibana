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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SearchApplicationEventDataStream = z.object({
  name: IndexName
}).meta({ id: 'SearchApplicationEventDataStream' })
export type SearchApplicationEventDataStream = z.infer<typeof SearchApplicationEventDataStream>

export const SearchApplicationAnalyticsCollection = z.object({
  event_data_stream: SearchApplicationEventDataStream.describe('Data stream for the collection.')
}).meta({ id: 'SearchApplicationAnalyticsCollection' })
export type SearchApplicationAnalyticsCollection = z.infer<typeof SearchApplicationAnalyticsCollection>

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
