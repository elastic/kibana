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

/** GravityZone endpoint and resource IDs are 24-hex-character strings. */
const HEX_ID_RE = /^[0-9a-fA-F]{24}$/;
const hexId = (label: string) =>
  z.string().regex(HEX_ID_RE, `${label} must be exactly 24 hexadecimal characters`).max(24);

/** Reusable page/perPage pair for paginated actions. */
const pageParam = () =>
  z.number().int().min(1).optional().describe('Page number (1-based). Default 1.');
const perPageParam = () =>
  z.number().int().min(1).max(100).optional().describe('Items per page, 1 to 100. Default 30.');

// ---------------------------------------------------------------------------
// searchEndpoints
// ---------------------------------------------------------------------------

export const SearchEndpointsInputSchema = lazySchema(() =>
  z.object({
    page: pageParam(),
    perPage: perPageParam(),
    filters: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe(
        'Filter object: managedWithBest, managedExchangeServers, managedRelays, ' +
          'allItemsRecursively (booleans), or a name prefix (min 3 chars, optional leading * wildcard).'
      ),
    options: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe('Controls which fields appear in the response.'),
  })
);
export type SearchEndpointsInput = z.infer<typeof SearchEndpointsInputSchema>;

// ---------------------------------------------------------------------------
// getEndpoint
// ---------------------------------------------------------------------------

export const GetEndpointInputSchema = lazySchema(() =>
  z.object({
    endpointId: hexId('endpointId').describe('24-hex-char endpoint ID from searchEndpoints.'),
    options: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe('Controls which fields appear in the response.'),
  })
);
export type GetEndpointInput = z.infer<typeof GetEndpointInputSchema>;

// ---------------------------------------------------------------------------
// isolateEndpoint
// ---------------------------------------------------------------------------

export const IsolateEndpointInputSchema = lazySchema(() =>
  z.object({
    endpointIds: z
      .array(hexId('endpointId'))
      .min(1)
      .max(1000)
      .describe('Endpoint IDs to isolate (24 hex chars each). Max 1000.'),
  })
);
export type IsolateEndpointInput = z.infer<typeof IsolateEndpointInputSchema>;

// ---------------------------------------------------------------------------
// restoreEndpointFromIsolation
// ---------------------------------------------------------------------------

export const RestoreEndpointFromIsolationInputSchema = lazySchema(() =>
  z.object({
    endpointIds: z
      .array(hexId('endpointId'))
      .min(1)
      .max(1000)
      .describe('Endpoint IDs to restore from isolation (24 hex chars each). Max 1000.'),
  })
);
export type RestoreEndpointFromIsolationInput = z.infer<
  typeof RestoreEndpointFromIsolationInputSchema
>;

// ---------------------------------------------------------------------------
// scanEndpoint
// ---------------------------------------------------------------------------

export const ScanEndpointInputSchema = lazySchema(() =>
  z.object({
    targetIds: z
      .array(hexId('targetId'))
      .min(1)
      .max(100)
      .describe('Endpoint or group IDs to scan (24 hex chars each). Max 100.'),
    type: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .describe('Scan type: 1=Quick, 2=Full, 3=Memory, 4=Custom.'),
    name: z.string().max(255).optional().describe('Task name. Auto-generated if omitted.'),
    customScanSettings: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe('Custom scan settings (depth, paths). Only used when type=4.'),
    returnAllTaskIds: z
      .boolean()
      .optional()
      .describe('If true, returns an array of all created task IDs.'),
  })
);
export type ScanEndpointInput = z.infer<typeof ScanEndpointInputSchema>;

// ---------------------------------------------------------------------------
// getTask
// ---------------------------------------------------------------------------

export const GetTaskInputSchema = lazySchema(() =>
  z.object({
    taskId: z.string().min(1).max(128).describe('Task ID returned by a create* action.'),
    returnSubtasks: z
      .boolean()
      .optional()
      .describe('If true, include per-endpoint subtask details.'),
    status: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional()
      .describe('Filter subtasks by status: 1=Pending, 2=In progress, 3=Finished.'),
  })
);
export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

// ---------------------------------------------------------------------------
// listQuarantineItems
// ---------------------------------------------------------------------------

export const ListQuarantineItemsInputSchema = lazySchema(() =>
  z.object({
    page: pageParam(),
    perPage: perPageParam(),
    endpointId: hexId('endpointId')
      .optional()
      .describe('Filter to a single endpoint. 24 hex chars.'),
  })
);
export type ListQuarantineItemsInput = z.infer<typeof ListQuarantineItemsInputSchema>;

// ---------------------------------------------------------------------------
// restoreQuarantineItem
// ---------------------------------------------------------------------------

export const RestoreQuarantineItemInputSchema = lazySchema(() =>
  z.object({
    quarantineItemsIds: z
      .array(z.string().min(1).max(128))
      .min(1)
      .max(100)
      .describe('Quarantine item IDs to restore. Max 100.'),
    locationToRestore: z
      .string()
      .max(4096)
      .optional()
      .describe('Absolute path for restore. Original location if omitted.'),
    addExclusionInPolicy: z
      .boolean()
      .optional()
      .describe('If true, adds an exclusion policy for the restored file.'),
  })
);
export type RestoreQuarantineItemInput = z.infer<typeof RestoreQuarantineItemInputSchema>;

// ---------------------------------------------------------------------------
// deleteQuarantineItem
// ---------------------------------------------------------------------------

export const DeleteQuarantineItemInputSchema = lazySchema(() =>
  z.object({
    quarantineItemsIds: z
      .array(z.string().min(1).max(128))
      .min(1)
      .max(100)
      .describe('Quarantine item IDs to permanently delete. Max 100.'),
  })
);
export type DeleteQuarantineItemInput = z.infer<typeof DeleteQuarantineItemInputSchema>;

// ---------------------------------------------------------------------------
// quarantineFile
// ---------------------------------------------------------------------------

export const QuarantineFileInputSchema = lazySchema(() =>
  z.object({
    endpointIds: z
      .array(hexId('endpointId'))
      .min(1)
      .max(100)
      .describe('Endpoint IDs on which to quarantine the file. Max 100.'),
    filePath: z.string().min(1).max(4096).describe('Absolute file path on the target endpoint.'),
  })
);
export type QuarantineFileInput = z.infer<typeof QuarantineFileInputSchema>;

// ---------------------------------------------------------------------------
// addToBlocklist
// ---------------------------------------------------------------------------

export const AddToBlocklistInputSchema = lazySchema(() =>
  z.object({
    hashType: z.union([z.literal(1), z.literal(2)]).describe('Hash algorithm: 1=SHA256, 2=MD5.'),
    hashList: z
      .array(z.string().min(1).max(128))
      .min(1)
      .max(100)
      .describe('File hashes to add to the blocklist.'),
    sourceInfo: z
      .string()
      .min(1)
      .max(1024)
      .describe('Description or source label for the blocklist entries.'),
  })
);
export type AddToBlocklistInput = z.infer<typeof AddToBlocklistInputSchema>;

// ---------------------------------------------------------------------------
// getBlocklistItems
// ---------------------------------------------------------------------------

export const GetBlocklistItemsInputSchema = lazySchema(() =>
  z.object({
    page: pageParam(),
    perPage: perPageParam(),
  })
);
export type GetBlocklistItemsInput = z.infer<typeof GetBlocklistItemsInputSchema>;

// ---------------------------------------------------------------------------
// removeFromBlocklist
// ---------------------------------------------------------------------------

export const RemoveFromBlocklistInputSchema = lazySchema(() =>
  z.object({
    hashItemId: z.string().min(1).max(128).describe('Blocklist item ID to remove.'),
  })
);
export type RemoveFromBlocklistInput = z.infer<typeof RemoveFromBlocklistInputSchema>;

// ---------------------------------------------------------------------------
// listGroups
// ---------------------------------------------------------------------------

export const ListGroupsInputSchema = lazySchema(() =>
  z.object({
    parentId: hexId('parentId').optional().describe('Parent group ID. Omit for top-level groups.'),
  })
);
export type ListGroupsInput = z.infer<typeof ListGroupsInputSchema>;

// ---------------------------------------------------------------------------
// listPolicies
// ---------------------------------------------------------------------------

export const ListPoliciesInputSchema = lazySchema(() =>
  z.object({
    page: pageParam(),
    perPage: perPageParam(),
  })
);
export type ListPoliciesInput = z.infer<typeof ListPoliciesInputSchema>;
