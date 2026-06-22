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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IngestMaxmind = z.object({
  account_id: Id
}).meta({ id: 'IngestMaxmind' })
export type IngestMaxmind = z.infer<typeof IngestMaxmind>

/**
 * Create or update a GeoIP database configuration.
 *
 * Refer to the create or update IP geolocation database configuration API.
 */
export const IngestPutGeoipDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('ID of the database configuration to create or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  name: Name.describe('The provider-assigned name of the IP geolocation database to download.').meta({ found_in: 'body' }),
  maxmind: IngestMaxmind.describe('The configuration necessary to identify which IP geolocation provider to use to download the database, as well as any provider-specific configuration necessary for such downloading. At present, the only supported provider is maxmind, and the maxmind provider requires that an account_id (string) is configured.').meta({ found_in: 'body' })
}).meta({ id: 'IngestPutGeoipDatabaseRequest' })
export type IngestPutGeoipDatabaseRequest = z.infer<typeof IngestPutGeoipDatabaseRequest>

export const IngestPutGeoipDatabaseResponse = AcknowledgedResponseBase.meta({ id: 'IngestPutGeoipDatabaseResponse' })
export type IngestPutGeoipDatabaseResponse = z.infer<typeof IngestPutGeoipDatabaseResponse>
