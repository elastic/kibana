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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ulong = z.number().meta({ id: 'ulong' })
export type ulong = z.infer<typeof ulong>

export const XpackUsageSecurityRolesDlsBitSetCache = z.object({
  count: integer.describe('Number of entries in the cache.'),
  memory: ByteSize.describe('Human-readable amount of memory taken up by the cache.').optional(),
  memory_in_bytes: ulong.describe('Memory taken up by the cache in bytes.'),
  hits: long.describe('Total number of cache hits.'),
  misses: long.describe('Total number of cache misses.'),
  evictions: long.describe('Total number of cache evictions.'),
  hits_time_in_millis: DurationValue.describe('Total combined time spent in cache for hits in milliseconds.'),
  misses_time_in_millis: DurationValue.describe('Total combined time spent in cache for misses in milliseconds.')
}).meta({ id: 'XpackUsageSecurityRolesDlsBitSetCache' })
export type XpackUsageSecurityRolesDlsBitSetCache = z.infer<typeof XpackUsageSecurityRolesDlsBitSetCache>

export const XpackUsageSecurityRolesDls = z.object({
  bit_set_cache: XpackUsageSecurityRolesDlsBitSetCache
}).meta({ id: 'XpackUsageSecurityRolesDls' })
export type XpackUsageSecurityRolesDls = z.infer<typeof XpackUsageSecurityRolesDls>

export const SecurityRolesStats = z.object({
  dls: XpackUsageSecurityRolesDls.describe('Document-level security (DLS) statistics.')
}).meta({ id: 'SecurityRolesStats' })
export type SecurityRolesStats = z.infer<typeof SecurityRolesStats>

export const SecurityNodeSecurityStats = z.object({
  roles: SecurityRolesStats.describe('Role statistics.')
}).meta({ id: 'SecurityNodeSecurityStats' })
export type SecurityNodeSecurityStats = z.infer<typeof SecurityNodeSecurityStats>

/**
 * Get security stats.
 *
 * Gather security usage statistics from all node(s) within the cluster.
 */
export const SecurityGetStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'SecurityGetStatsRequest' })
export type SecurityGetStatsRequest = z.infer<typeof SecurityGetStatsRequest>

export const SecurityGetStatsResponse = z.object({
  nodes: z.record(z.string(), SecurityNodeSecurityStats).describe('A map of node IDs to security statistics for that node.')
}).meta({ id: 'SecurityGetStatsResponse' })
export type SecurityGetStatsResponse = z.infer<typeof SecurityGetStatsResponse>
