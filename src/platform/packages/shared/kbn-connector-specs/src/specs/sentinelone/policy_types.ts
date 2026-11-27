/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ISO_DATE_HINT, idString } from './types';

// addHashToBlocklist
export const AddHashToBlocklistInputSchema = lazySchema(() =>
  z.object({
    osType: z.enum(['windows', 'linux', 'windows_legacy', 'macos']).describe('Operating system'),
    sha1: z.string().max(40).optional().describe('SHA1 hash; sha1 or sha256 is required'),
    sha256: z.string().max(64).optional().describe('SHA256 hash'),
    description: z.string().max(1000).optional().describe('Description'),
    source: z.string().max(255).optional().describe('Source label'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope; one scope is required'),
  })
);
export type AddHashToBlocklistInput = z.infer<typeof AddHashToBlocklistInputSchema>;

// removeHashFromBlocklist
export const RemoveHashFromBlocklistInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(idString(32)).min(1).max(5000).describe('Blocklist item ids from searchBlocklist'),
  })
);
export type RemoveHashFromBlocklistInput = z.infer<typeof RemoveHashFromBlocklistInputSchema>;

// searchBlocklist
export const SearchBlocklistInputSchema = lazySchema(() =>
  z.object({
    value: z.string().max(64).optional().describe('Exact hash'),
    valueContains: z.array(z.string().min(1).max(64)).max(10).optional().describe('Hash contains'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type SearchBlocklistInput = z.infer<typeof SearchBlocklistInputSchema>;

// createExclusion
export const CreateExclusionInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['path', 'certificate', 'browser', 'file_type', 'white_hash'])
      .describe('Exclusion type'),
    osType: z.enum(['windows', 'linux', 'windows_legacy', 'macos']).describe('Operating system'),
    value: z.string().min(1).max(1024).describe('Value for the type, for example a path or a hash'),
    description: z.string().max(1000).optional().describe('Description'),
    mode: z
      .enum([
        'suppress',
        'suppress_dynamic_only',
        'suppress_dfi_only',
        'disable_in_process_monitor',
        'disable_in_process_monitor_deep',
        'disable_all_monitors',
        'disable_all_monitors_deep',
        'suppress_app_control',
        'suppress_drift_detection',
      ])
      .optional()
      .describe('Path exclusion mode (type path only)'),
    pathExclusionType: z
      .string()
      .max(64)
      .optional()
      .describe('Path exclusion type (type path only)'),
    actions: z
      .array(z.enum(['upload', 'detect']))
      .max(2)
      .optional()
      .describe('Exclusion actions'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope; one scope is required'),
  })
);
export type CreateExclusionInput = z.infer<typeof CreateExclusionInputSchema>;

// listExclusions
export const ListExclusionsInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['path', 'certificate', 'browser', 'file_type', 'white_hash', 'dv_exclusions'])
      .optional()
      .describe('Exclusion type'),
    osTypes: z
      .array(z.enum(['windows', 'linux', 'windows_legacy', 'macos']))
      .max(4)
      .optional()
      .describe('Operating systems'),
    value: z.string().max(1024).optional().describe('Exact value'),
    valueContains: z
      .array(z.string().min(1).max(1024))
      .max(20)
      .optional()
      .describe('Value contains'),
    ids: z.array(idString(32)).max(1000).optional().describe('Exclusion ids'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type ListExclusionsInput = z.infer<typeof ListExclusionsInputSchema>;

// deleteExclusion
export const DeleteExclusionInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(idString(32)).min(1).max(1000).describe('Exclusion ids from listExclusions'),
    type: z
      .enum(['path', 'certificate', 'browser', 'file_type', 'white_hash'])
      .optional()
      .describe('Exclusion type'),
  })
);
export type DeleteExclusionInput = z.infer<typeof DeleteExclusionInputSchema>;

// createIOC
export const CreateIOCInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['DNS', 'IPV4', 'IPV6', 'MD5', 'SHA1', 'SHA256', 'URL'])
      .describe('Indicator type'),
    value: z.string().min(1).max(2048).describe('Indicator value'),
    source: z.string().min(1).max(255).describe('Source label'),
    validUntil: z.string().min(1).max(40).optional().describe(`Expiry, ${ISO_DATE_HINT}`),
    name: z.string().max(255).optional().describe('Indicator name'),
    description: z.string().max(1000).optional().describe('Description'),
    externalId: z.string().max(255).optional().describe('External id'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope; one scope is required'),
  })
);
export type CreateIOCInput = z.infer<typeof CreateIOCInputSchema>;

// searchIOCs
export const SearchIOCsInputSchema = lazySchema(() =>
  z.object({
    value: z.string().max(2048).optional().describe('Exact indicator value'),
    type: z
      .enum(['DNS', 'IPV4', 'IPV6', 'MD5', 'SHA1', 'SHA256', 'URL'])
      .optional()
      .describe('Indicator type'),
    source: z.array(z.string().min(1).max(255)).max(100).optional().describe('Source labels'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type SearchIOCsInput = z.infer<typeof SearchIOCsInputSchema>;

// deleteIOC
export const DeleteIOCInputSchema = lazySchema(() =>
  z.object({
    accountIds: z.array(idString(32)).min(1).max(500).describe('Account ids of the indicators'),
    uuids: z.array(idString(64)).min(1).max(5000).describe('Indicator uuids from searchIOCs'),
    type: z
      .enum(['DNS', 'IPV4', 'IPV6', 'MD5', 'SHA1', 'SHA256', 'URL'])
      .optional()
      .describe('Indicator type'),
  })
);
export type DeleteIOCInput = z.infer<typeof DeleteIOCInputSchema>;

// listFirewallRules
export const ListFirewallRulesInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(200).optional().describe('Rule name'),
    actions: z
      .array(z.enum(['Allow', 'Block']))
      .max(2)
      .optional()
      .describe('Rule actions'),
    statuses: z
      .array(z.enum(['Enabled', 'Disabled']))
      .max(2)
      .optional()
      .describe('Rule statuses'),
    osTypes: z
      .array(z.enum(['windows', 'linux', 'windows_legacy', 'macos']))
      .max(4)
      .optional()
      .describe('Operating systems'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type ListFirewallRulesInput = z.infer<typeof ListFirewallRulesInputSchema>;

// createFirewallRule
export const CreateFirewallRuleInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Rule name'),
    action: z.enum(['Allow', 'Block']).describe('Rule action'),
    status: z.enum(['Enabled', 'Disabled']).describe('Rule status'),
    direction: z.enum(['any', 'inbound', 'outbound']).optional().describe('Traffic direction'),
    osTypes: z
      .array(z.enum(['windows', 'linux', 'windows_legacy', 'macos']))
      .max(4)
      .optional()
      .describe('Operating systems'),
    remoteHosts: z
      .array(
        z.object({
          type: z.enum(['any', 'cidr', 'range', 'addresses', 'fqdn']).describe('Remote host type'),
          values: z
            .array(z.string().min(1).max(255))
            .max(5000)
            .optional()
            .describe('Values for the type, for example 10.0.0.0/8 or example.com'),
        })
      )
      .max(100)
      .optional()
      .describe('Remote hosts, for example [{type: cidr, values: [10.0.0.0/8]}]'),
    protocol: z.string().max(16).optional().describe('Protocol, for example TCP or UDP'),
    description: z.string().max(1000).optional().describe('Description'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope; one scope is required'),
  })
);
export type CreateFirewallRuleInput = z.infer<typeof CreateFirewallRuleInputSchema>;

// deleteFirewallRule
export const DeleteFirewallRuleInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(idString(32)).min(1).max(1000).describe('Rule ids'),
  })
);
export type DeleteFirewallRuleInput = z.infer<typeof DeleteFirewallRuleInputSchema>;
