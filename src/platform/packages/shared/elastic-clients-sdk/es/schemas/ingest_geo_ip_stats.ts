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

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const IngestGeoIpStatsGeoIpDownloadStatistics = z.object({
  successful_downloads: integer.describe('Total number of successful database downloads.'),
  failed_downloads: integer.describe('Total number of failed database downloads.'),
  total_download_time: DurationValue.describe('Total milliseconds spent downloading databases.'),
  databases_count: integer.describe('Current number of databases available for use.'),
  skipped_updates: integer.describe('Total number of database updates skipped.'),
  expired_databases: integer.describe('Total number of databases not updated after 30 days')
}).meta({ id: 'IngestGeoIpStatsGeoIpDownloadStatistics' })
export type IngestGeoIpStatsGeoIpDownloadStatistics = z.infer<typeof IngestGeoIpStatsGeoIpDownloadStatistics>

export const IngestGeoIpStatsGeoIpNodeDatabaseName = z.object({
  name: Name.describe('Name of the database.')
}).meta({ id: 'IngestGeoIpStatsGeoIpNodeDatabaseName' })
export type IngestGeoIpStatsGeoIpNodeDatabaseName = z.infer<typeof IngestGeoIpStatsGeoIpNodeDatabaseName>

/** Downloaded databases for the node. The field key is the node ID. */
export const IngestGeoIpStatsGeoIpNodeDatabases = z.object({
  databases: z.array(IngestGeoIpStatsGeoIpNodeDatabaseName).describe('Downloaded databases for the node.'),
  files_in_temp: z.array(z.string()).describe('Downloaded database files, including related license files. Elasticsearch stores these files in the node’s temporary directory: $ES_TMPDIR/geoip-databases/<node_id>.')
}).meta({ id: 'IngestGeoIpStatsGeoIpNodeDatabases' })
export type IngestGeoIpStatsGeoIpNodeDatabases = z.infer<typeof IngestGeoIpStatsGeoIpNodeDatabases>

/**
 * Get GeoIP statistics.
 *
 * Get download statistics for GeoIP2 databases that are used with the GeoIP processor.
 */
export const IngestGeoIpStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IngestGeoIpStatsRequest' })
export type IngestGeoIpStatsRequest = z.infer<typeof IngestGeoIpStatsRequest>

export const IngestGeoIpStatsResponse = z.object({
  stats: IngestGeoIpStatsGeoIpDownloadStatistics.describe('Download statistics for all GeoIP2 databases.'),
  nodes: z.record(Id, IngestGeoIpStatsGeoIpNodeDatabases).describe('Downloaded GeoIP2 databases for each node.')
}).meta({ id: 'IngestGeoIpStatsResponse' })
export type IngestGeoIpStatsResponse = z.infer<typeof IngestGeoIpStatsResponse>
