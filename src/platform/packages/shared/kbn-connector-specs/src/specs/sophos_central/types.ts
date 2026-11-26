/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidString = (desc: string) =>
  z
    .string()
    .max(36)
    .regex(UUID_RE, 'Must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)')
    .describe(desc);

/**
 * Alert lifecycle action values exposed to Agent Builder agents.
 * `authPua` is intentionally excluded — it authorises a potentially unwanted
 * application, which relaxes protection (same reason addAllowedItem is isTool: false).
 */
const ALERT_ACTIONS = [
  'acknowledge',
  'cleanPua',
  'cleanVirus',
  'clearThreat',
  'clearHmpa',
  'sendMsgPua',
  'sendMsgThreat',
] as const;

const ALERT_SEVERITY = ['high', 'medium', 'low'] as const;
const ALERT_PRODUCT = [
  'cswitch',
  'emailGateway',
  'encryption',
  'endpoint',
  'firewall',
  'mobile',
  'other',
  'phishThreat',
  'secureWebservice',
  'server',
  'webGateway',
  'wireless',
  'ztna',
] as const;
const ENDPOINT_HEALTH = ['bad', 'good', 'suspicious', 'unknown'] as const;
const DETECTION_TYPE = ['process', 'threat', 'vulnerability'] as const;
const DETECTION_CATEGORY = [
  'cloud',
  'compound',
  'email',
  'endpoint',
  'firewall',
  'iam',
  'backupAndRecovery',
  'network',
] as const;

// ---------------------------------------------------------------------------
// Alert schemas
// ---------------------------------------------------------------------------

export const ListAlertsInputSchema = lazySchema(() =>
  z.object({
    severity: z
      .array(z.enum(ALERT_SEVERITY))
      .max(3)
      .optional()
      .describe('Filter by severity: high, medium, low.'),
    product: z
      .array(z.enum(ALERT_PRODUCT))
      .max(13)
      .optional()
      .describe(
        'Filter by Sophos product: cswitch, emailGateway, encryption, endpoint, firewall, mobile, other, phishThreat, secureWebservice, server, webGateway, wireless, ztna.'
      ),
    category: z.array(z.string().max(100)).max(20).optional().describe('Filter by alert category.'),
    from: z
      .string()
      .max(50)
      .optional()
      .describe('Start of the date range, ISO 8601 format (e.g. 2024-01-01T00:00:00.000Z).'),
    to: z
      .string()
      .max(50)
      .optional()
      .describe('End of the date range, ISO 8601 format (e.g. 2024-12-31T23:59:59.999Z).'),
    pageFromKey: z
      .string()
      .max(512)
      .optional()
      .describe('Cursor for the next page. Pass the value from pages.nextKey.'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of alerts per page (1–100, default 50).'),
  })
);
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const GetAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: uuidString('The UUID of the alert to retrieve.'),
  })
);
export type GetAlertInput = z.infer<typeof GetAlertInputSchema>;

export const ActOnAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: uuidString('The UUID of the alert to act on.'),
    action: z
      .enum(ALERT_ACTIONS)
      .describe('The lifecycle action to apply. Check allowedActions from getAlert first.'),
    message: z
      .string()
      .max(1000)
      .optional()
      .describe('Optional message to attach to the action (up to 1000 chars).'),
  })
);
export type ActOnAlertInput = z.infer<typeof ActOnAlertInputSchema>;

export const ActOnAlertsBulkInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(uuidString('Alert UUID.'))
      .min(1)
      .max(100)
      .describe('Array of alert UUIDs to act on (1–100).'),
    action: z.enum(ALERT_ACTIONS).describe('The lifecycle action to apply to all alerts.'),
    message: z
      .string()
      .max(1000)
      .optional()
      .describe('Optional message to attach to the action (up to 1000 chars).'),
  })
);
export type ActOnAlertsBulkInput = z.infer<typeof ActOnAlertsBulkInputSchema>;

// ---------------------------------------------------------------------------
// Endpoint schemas
// ---------------------------------------------------------------------------

export const ListEndpointsInputSchema = lazySchema(() =>
  z.object({
    healthStatus: z
      .array(z.enum(ENDPOINT_HEALTH))
      .max(4)
      .optional()
      .describe('Filter by health status: bad, good, suspicious, unknown.'),
    isolationStatus: z
      .enum(['isolated', 'notIsolated'])
      .optional()
      .describe('Filter by isolation state: isolated or notIsolated.'),
    tamperProtectionEnabled: z
      .boolean()
      .optional()
      .describe('Filter by tamper protection state (true or false).'),
    hostnameContains: z.string().max(100).optional().describe('Substring match on hostname.'),
    pageFromKey: z
      .string()
      .max(512)
      .optional()
      .describe('Cursor for the next page. Pass the value from pages.nextKey.'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of endpoints per page (1–100, default 50).'),
  })
);
export type ListEndpointsInput = z.infer<typeof ListEndpointsInputSchema>;

export const GetEndpointInputSchema = lazySchema(() =>
  z.object({
    endpointId: uuidString('The UUID of the endpoint to retrieve.'),
  })
);
export type GetEndpointInput = z.infer<typeof GetEndpointInputSchema>;

export const IsolateEndpointInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(uuidString('Endpoint UUID.'))
      .min(1)
      .max(500)
      .describe('Endpoint UUIDs to isolate (1–500).'),
    comment: z
      .string()
      .max(400)
      .optional()
      .describe('Optional comment for the isolation request (up to 400 chars).'),
  })
);
export type IsolateEndpointInput = z.infer<typeof IsolateEndpointInputSchema>;

export const DeisolateEndpointInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(uuidString('Endpoint UUID.'))
      .min(1)
      .max(500)
      .describe('Endpoint UUIDs to de-isolate (1–500).'),
    comment: z
      .string()
      .max(400)
      .optional()
      .describe('Optional comment for the de-isolation request (up to 400 chars).'),
  })
);
export type DeisolateEndpointInput = z.infer<typeof DeisolateEndpointInputSchema>;

export const ScanEndpointInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(uuidString('Endpoint UUID.'))
      .min(1)
      .max(500)
      .describe('Endpoint UUIDs to scan (1–500).'),
  })
);
export type ScanEndpointInput = z.infer<typeof ScanEndpointInputSchema>;

export const GetTamperProtectionInputSchema = lazySchema(() =>
  z.object({
    endpointId: uuidString('The UUID of the endpoint to check tamper protection for.'),
  })
);
export type GetTamperProtectionInput = z.infer<typeof GetTamperProtectionInputSchema>;

export const UpdateTamperProtectionInputSchema = lazySchema(() =>
  z.object({
    endpointId: uuidString('The UUID of the endpoint to update tamper protection for.'),
    enabled: z.boolean().describe('Set to true to enable tamper protection, false to disable.'),
    regeneratePassword: z
      .boolean()
      .optional()
      .describe('Set to true to regenerate the recovery password.'),
  })
);
export type UpdateTamperProtectionInput = z.infer<typeof UpdateTamperProtectionInputSchema>;

// ---------------------------------------------------------------------------
// Blocked / allowed item schemas
// ---------------------------------------------------------------------------

export const ListBlockedItemsInputSchema = lazySchema(() =>
  z.object({
    page: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe('Page number (1-based). Increment until page > pages.total.'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of items per page (1–100, default 50).'),
  })
);
export type ListBlockedItemsInput = z.infer<typeof ListBlockedItemsInputSchema>;

export const AddBlockedItemInputSchema = lazySchema(() =>
  z.object({
    sha256: z
      .string()
      .length(64)
      .regex(/^[0-9a-fA-F]+$/, 'Must be a 64-character hexadecimal SHA-256 hash')
      .describe('The SHA-256 file hash to block (64 hex characters).'),
    comment: z
      .string()
      .min(1)
      .max(1000)
      .describe('A comment explaining why this item is blocked (required by Sophos).'),
  })
);
export type AddBlockedItemInput = z.infer<typeof AddBlockedItemInputSchema>;

export const AddAllowedItemInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['path', 'sha256', 'certificateSigner', 'posixPath'])
      .describe('The type of item to allow: path, sha256, certificateSigner, or posixPath.'),
    properties: z
      .record(z.string().max(256), z.string().max(2048))
      .describe(
        'Properties matching the type, e.g. { path: "C:\\\\example" } or { sha256: "abc..." }.'
      ),
    comment: z
      .string()
      .min(1)
      .max(1000)
      .describe('A comment explaining why this item is allowed (required by Sophos).'),
  })
);
export type AddAllowedItemInput = z.infer<typeof AddAllowedItemInputSchema>;

export const DeleteBlockedItemInputSchema = lazySchema(() =>
  z.object({
    blockedItemId: z
      .string()
      .min(1)
      .max(256)
      .describe('The ID of the blocked item to remove. Use listBlockedItems to find it.'),
  })
);
export type DeleteBlockedItemInput = z.infer<typeof DeleteBlockedItemInputSchema>;

// ---------------------------------------------------------------------------
// Detections schema
// ---------------------------------------------------------------------------

export const ListDetectionsInputSchema = lazySchema(() =>
  z.object({
    runId: uuidString('The run ID from a previous listDetections call, for pagination.').optional(),
    severity: z
      .array(z.number().int().min(0).max(10))
      .max(11)
      .optional()
      .describe('Filter by severity level (0–10, where 10 is most severe).'),
    type: z
      .array(z.enum(DETECTION_TYPE))
      .max(3)
      .optional()
      .describe('Filter by detection type: process, threat, or vulnerability.'),
    category: z
      .array(z.enum(DETECTION_CATEGORY))
      .max(8)
      .optional()
      .describe(
        'Filter by category: cloud, compound, email, endpoint, firewall, iam, backupAndRecovery, network.'
      ),
    from: z
      .string()
      .max(50)
      .optional()
      .describe('Start of the date range, ISO 8601 format (e.g. 2024-01-01T00:00:00.000Z).'),
    to: z
      .string()
      .max(50)
      .optional()
      .describe('End of the date range, ISO 8601 format (e.g. 2024-12-31T23:59:59.999Z).'),
    page: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe('Page number for results (1-based).'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Number of detections per page (1–1000, default 50).'),
  })
);
export type ListDetectionsInput = z.infer<typeof ListDetectionsInputSchema>;
