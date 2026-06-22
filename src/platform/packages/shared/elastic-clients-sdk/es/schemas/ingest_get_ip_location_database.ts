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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const IngestWeb = z.object({
}).meta({ id: 'IngestWeb' })
export type IngestWeb = z.infer<typeof IngestWeb>

export const IngestLocal = z.object({
  type: z.string()
}).meta({ id: 'IngestLocal' })
export type IngestLocal = z.infer<typeof IngestLocal>

export const IngestMaxmind = z.object({
  account_id: Id
}).meta({ id: 'IngestMaxmind' })
export type IngestMaxmind = z.infer<typeof IngestMaxmind>

export const IngestIpinfo = z.object({
}).meta({ id: 'IngestIpinfo' })
export type IngestIpinfo = z.infer<typeof IngestIpinfo>

const IngestDatabaseConfigurationFullCommonProps = z.object({
  name: Name.describe('The provider-assigned name of the IP geolocation database to download.')
})

const IngestDatabaseConfigurationFullExclusiveProps = z.union([z.object({ web: IngestWeb }), z.object({ local: IngestLocal }), z.object({ maxmind: IngestMaxmind }), z.object({ ipinfo: IngestIpinfo })])

export const IngestDatabaseConfigurationFull = IngestDatabaseConfigurationFullCommonProps.and(IngestDatabaseConfigurationFullExclusiveProps).meta({ id: 'IngestDatabaseConfigurationFull' })
export type IngestDatabaseConfigurationFull = z.infer<typeof IngestDatabaseConfigurationFull>

export const IngestGetIpLocationDatabaseDatabaseConfigurationMetadata = z.object({
  id: Id,
  version: VersionNumber,
  modified_date_millis: EpochTime.optional(),
  modified_date: EpochTime.optional(),
  database: IngestDatabaseConfigurationFull
}).meta({ id: 'IngestGetIpLocationDatabaseDatabaseConfigurationMetadata' })
export type IngestGetIpLocationDatabaseDatabaseConfigurationMetadata = z.infer<typeof IngestGetIpLocationDatabaseDatabaseConfigurationMetadata>

/** Get IP geolocation database configurations. */
export const IngestGetIpLocationDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Ids.describe('Comma-separated list of database configuration IDs to retrieve. Wildcard (`*`) expressions are supported. To get all database configurations, omit this parameter or use `*`.').optional().meta({ found_in: 'path' })
}).meta({ id: 'IngestGetIpLocationDatabaseRequest' })
export type IngestGetIpLocationDatabaseRequest = z.infer<typeof IngestGetIpLocationDatabaseRequest>

export const IngestGetIpLocationDatabaseResponse = z.object({
  databases: z.array(IngestGetIpLocationDatabaseDatabaseConfigurationMetadata)
}).meta({ id: 'IngestGetIpLocationDatabaseResponse' })
export type IngestGetIpLocationDatabaseResponse = z.infer<typeof IngestGetIpLocationDatabaseResponse>
