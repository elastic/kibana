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
const uuidString = () =>
  z.string().regex(UUID_RE, 'Must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');

/** Alert lifecycle action values from the Sophos Common API v1 spec. */
const ALERT_ACTIONS = [
  'acknowledge',
  'cleanPua',
  'cleanVirus',
  'authPua',
  'clearThreat',
  'clearHmpa',
  'sendMsgPua',
  'sendMsgThreat',
] as const;

// ---------------------------------------------------------------------------
// Alert schemas
// ---------------------------------------------------------------------------

export const ListAlertsInputSchema = lazySchema(() =>
  z.object({
    severity: z.array(z.string().max(50)).max(10).optional(),
    product: z.array(z.string().max(100)).max(10).optional(),
    category: z.array(z.string().max(100)).max(20).optional(),
    from: z.string().max(50).optional(),
    to: z.string().max(50).optional(),
    pageFromKey: z.string().max(512).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
);
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const GetAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: uuidString(),
  })
);
export type GetAlertInput = z.infer<typeof GetAlertInputSchema>;

export const ActOnAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: uuidString(),
    action: z.enum(ALERT_ACTIONS),
    message: z.string().max(1000).optional(),
  })
);
export type ActOnAlertInput = z.infer<typeof ActOnAlertInputSchema>;

export const ActOnAlertsBulkInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(uuidString()).min(1).max(100),
    action: z.enum(ALERT_ACTIONS),
    message: z.string().max(1000).optional(),
  })
);
export type ActOnAlertsBulkInput = z.infer<typeof ActOnAlertsBulkInputSchema>;

// ---------------------------------------------------------------------------
// Endpoint schemas
// ---------------------------------------------------------------------------

export const ListEndpointsInputSchema = lazySchema(() =>
  z.object({
    healthStatus: z.array(z.string().max(50)).max(10).optional(),
    isolationStatus: z
      .enum(['isolated', 'notIsolated', 'pendingIsolation', 'pendingDeIsolation'])
      .optional(),
    tamperProtectionEnabled: z.boolean().optional(),
    hostnameContains: z.string().max(100).optional(),
    pageFromKey: z.string().max(512).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
);
export type ListEndpointsInput = z.infer<typeof ListEndpointsInputSchema>;

export const GetEndpointInputSchema = lazySchema(() =>
  z.object({
    endpointId: uuidString(),
  })
);
export type GetEndpointInput = z.infer<typeof GetEndpointInputSchema>;

export const IsolateEndpointInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(uuidString()).min(1).max(500),
    comment: z.string().max(400).optional(),
  })
);
export type IsolateEndpointInput = z.infer<typeof IsolateEndpointInputSchema>;

export const DeisolateEndpointInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(uuidString()).min(1).max(500),
    comment: z.string().max(400).optional(),
  })
);
export type DeisolateEndpointInput = z.infer<typeof DeisolateEndpointInputSchema>;

export const ScanEndpointInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(uuidString()).min(1).max(500),
  })
);
export type ScanEndpointInput = z.infer<typeof ScanEndpointInputSchema>;

export const GetTamperProtectionInputSchema = lazySchema(() =>
  z.object({
    endpointId: uuidString(),
  })
);
export type GetTamperProtectionInput = z.infer<typeof GetTamperProtectionInputSchema>;

export const UpdateTamperProtectionInputSchema = lazySchema(() =>
  z.object({
    endpointId: uuidString(),
    enabled: z.boolean(),
    regeneratePassword: z.boolean().optional(),
  })
);
export type UpdateTamperProtectionInput = z.infer<typeof UpdateTamperProtectionInputSchema>;

// ---------------------------------------------------------------------------
// Blocked / allowed item schemas
// ---------------------------------------------------------------------------

export const ListBlockedItemsInputSchema = lazySchema(() =>
  z.object({
    page: z.number().int().min(1).max(10000).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
);
export type ListBlockedItemsInput = z.infer<typeof ListBlockedItemsInputSchema>;

export const AddBlockedItemInputSchema = lazySchema(() =>
  z.object({
    sha256: z
      .string()
      .length(64)
      .regex(/^[0-9a-fA-F]+$/, 'Must be a 64-character hexadecimal SHA-256 hash'),
    comment: z.string().min(1).max(1000).optional(),
  })
);
export type AddBlockedItemInput = z.infer<typeof AddBlockedItemInputSchema>;

export const AddAllowedItemInputSchema = lazySchema(() =>
  z.object({
    type: z.enum(['path', 'sha256', 'certificateSigner', 'posixPath']),
    properties: z.record(z.string(), z.string().max(2048)),
    comment: z.string().min(1).max(1000).optional(),
  })
);
export type AddAllowedItemInput = z.infer<typeof AddAllowedItemInputSchema>;

export const DeleteBlockedItemInputSchema = lazySchema(() =>
  z.object({
    blockedItemId: z.string().min(1).max(256),
  })
);
export type DeleteBlockedItemInput = z.infer<typeof DeleteBlockedItemInputSchema>;

// ---------------------------------------------------------------------------
// Detections schema
// ---------------------------------------------------------------------------

export const ListDetectionsInputSchema = lazySchema(() =>
  z.object({
    severity: z.array(z.string().max(50)).max(10).optional(),
    type: z.array(z.string().max(100)).max(10).optional(),
    category: z.array(z.string().max(100)).max(20).optional(),
    from: z.string().max(50).optional(),
    to: z.string().max(50).optional(),
    page: z.number().int().min(1).max(10000).optional(),
    pageSize: z.number().int().min(1).max(1000).optional(),
  })
);
export type ListDetectionsInput = z.infer<typeof ListDetectionsInputSchema>;
