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

export const IngestIpinfo = z.object({
}).meta({ id: 'IngestIpinfo' })
export type IngestIpinfo = z.infer<typeof IngestIpinfo>

const IngestDatabaseConfigurationCommonProps = z.object({
  name: Name.describe('The provider-assigned name of the IP geolocation database to download.')
})

const IngestDatabaseConfigurationExclusiveProps = z.union([z.object({ maxmind: IngestMaxmind }), z.object({ ipinfo: IngestIpinfo })])

/**
 * The configuration necessary to identify which IP geolocation provider to use to download a database, as well as any provider-specific configuration necessary for such downloading.
 * At present, the only supported providers are `maxmind` and `ipinfo`, and the `maxmind` provider requires that an `account_id` (string) is configured.
 * A provider (either `maxmind` or `ipinfo`) must be specified. The web and local providers can be returned as read only configurations.
 */
export const IngestDatabaseConfiguration = IngestDatabaseConfigurationCommonProps.and(IngestDatabaseConfigurationExclusiveProps).meta({ id: 'IngestDatabaseConfiguration' })
export type IngestDatabaseConfiguration = z.infer<typeof IngestDatabaseConfiguration>

/** Create or update an IP geolocation database configuration. */
export const IngestPutIpLocationDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The database configuration identifier.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. A value of `-1` indicates that the request should never time out.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response indicates that it was not completely acknowledged. A value of `-1` indicates that the request should never time out.').optional().meta({ found_in: 'query' }),
  configuration: IngestDatabaseConfiguration.meta({ found_in: 'body' })
}).meta({ id: 'IngestPutIpLocationDatabaseRequest' })
export type IngestPutIpLocationDatabaseRequest = z.infer<typeof IngestPutIpLocationDatabaseRequest>

export const IngestPutIpLocationDatabaseResponse = AcknowledgedResponseBase.meta({ id: 'IngestPutIpLocationDatabaseResponse' })
export type IngestPutIpLocationDatabaseResponse = z.infer<typeof IngestPutIpLocationDatabaseResponse>
