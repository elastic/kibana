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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Get cluster info.
 *
 * Get basic build, version, and cluster information.
 * ::: In Serverless, `version.number` always reports the next target Elasticsearch release version at the time of the request. Serverless does not track to a traditional release versioning model; it is continuously updated. The version number is provided to maintain compatibility with existing clients, but it is not meaningful for assessing feature availability. Clients should detect a Serverless environment by checking for `build_flavor: serverless`.
 */
export const InfoRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'InfoRequest' })
export type InfoRequest = z.infer<typeof InfoRequest>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const ElasticsearchVersionInfo = z.object({
  build_date: DateTime.describe('The Elasticsearch Git commit\'s date.'),
  build_flavor: z.string().describe('The build flavor. For example, `default`.'),
  build_hash: z.string().describe('The Elasticsearch Git commit\'s SHA hash.'),
  build_snapshot: z.boolean().describe('Indicates whether the Elasticsearch build was a snapshot.'),
  build_type: z.string().describe('The build type that corresponds to how Elasticsearch was installed. For example, `docker`, `rpm`, or `tar`.'),
  lucene_version: VersionString.describe('The version number of Elasticsearch\'s underlying Lucene software.'),
  minimum_index_compatibility_version: VersionString.describe('The minimum index version with which the responding node can read from disk.'),
  minimum_wire_compatibility_version: VersionString.describe('The minimum node version with which the responding node can communicate. Also the minimum version from which you can perform a rolling upgrade.'),
  number: z.string().describe('The Elasticsearch version number. ::: IMPORTANT: For Serverless deployments, this static value is always `8.11.0` and is used solely for backward compatibility with legacy clients.  Serverless environments are versionless and automatically upgraded, so this value can be safely ignored.')
}).meta({ id: 'ElasticsearchVersionInfo' })
export type ElasticsearchVersionInfo = z.infer<typeof ElasticsearchVersionInfo>

export const InfoResponse = z.object({
  cluster_name: Name.describe('The responding cluster\'s name.'),
  cluster_uuid: Uuid,
  name: Name.describe('The responding node\'s name.'),
  tagline: z.string(),
  version: ElasticsearchVersionInfo.describe('Version information for the Elasticsearch cluster. In Serverless, `version.number` always reports the next target Elasticsearch release version at the time of the request, not an actual deployed version. The version number is provided to maintain client compatibility but is not meaningful for assessing feature availability. Use `build_flavor: serverless` to detect a Serverless environment.')
}).meta({ id: 'InfoResponse' })
export type InfoResponse = z.infer<typeof InfoResponse>
