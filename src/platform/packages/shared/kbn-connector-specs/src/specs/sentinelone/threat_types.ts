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

// mitigateThreat
export const MitigateThreatInputSchema = lazySchema(() =>
  z.object({
    action: z
      .enum([
        'kill',
        'remediate',
        'rollback-remediation',
        'quarantine',
        'un-quarantine',
        'remove_macros',
        'restore_macros',
      ])
      .describe('Mitigation action'),
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids from getThreats'),
  })
);
export type MitigateThreatInput = z.infer<typeof MitigateThreatInputSchema>;

// rollbackThreat
export const RollbackThreatInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids from getThreats'),
  })
);
export type RollbackThreatInput = z.infer<typeof RollbackThreatInputSchema>;

// getThreats
export const GetThreatsInputSchema = lazySchema(() =>
  z.object({
    analystVerdicts: z
      .array(z.enum(['undefined', 'true_positive', 'false_positive', 'suspicious']))
      .max(4)
      .optional()
      .describe('Analyst verdicts'),
    incidentStatuses: z
      .array(z.enum(['unresolved', 'in_progress', 'resolved']))
      .max(3)
      .optional()
      .describe('Incident statuses'),
    mitigationStatuses: z
      .array(z.enum(['not_mitigated', 'mitigated', 'marked_as_benign']))
      .max(3)
      .optional()
      .describe('Mitigation statuses'),
    confidenceLevels: z
      .array(z.enum(['malicious', 'suspicious', 'n/a']))
      .max(3)
      .optional()
      .describe('Confidence levels'),
    contentHashes: z
      .array(z.string().min(1).max(40))
      .max(1000)
      .optional()
      .describe('File SHA1 hashes'),
    agentIds: z.array(idString(32)).max(1000).optional().describe('Agent ids'),
    computerNameContains: z
      .array(z.string().min(1).max(255))
      .max(10)
      .optional()
      .describe('Computer name contains'),
    ids: z.array(idString(32)).max(1000).optional().describe('Threat ids'),
    createdAtGte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Detected at or after, ${ISO_DATE_HINT}`),
    createdAtLte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Detected at or before, ${ISO_DATE_HINT}`),
    sortBy: z
      .enum([
        'id',
        'createdAt',
        'updatedAt',
        'mitigationStatus',
        'agentComputerName',
        'contentHash',
      ])
      .optional()
      .describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type GetThreatsInput = z.infer<typeof GetThreatsInputSchema>;

// updateThreatVerdict
export const UpdateThreatVerdictInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids from getThreats'),
    analystVerdict: z
      .enum(['undefined', 'true_positive', 'false_positive', 'suspicious'])
      .describe('Analyst verdict'),
  })
);
export type UpdateThreatVerdictInput = z.infer<typeof UpdateThreatVerdictInputSchema>;

// updateThreatStatus
export const UpdateThreatStatusInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids from getThreats'),
    incidentStatus: z.enum(['unresolved', 'in_progress', 'resolved']).describe('Incident status'),
    analystVerdict: z
      .enum(['undefined', 'true_positive', 'false_positive', 'suspicious'])
      .optional()
      .describe('Analyst verdict to set as well'),
  })
);
export type UpdateThreatStatusInput = z.infer<typeof UpdateThreatStatusInputSchema>;

// addThreatNote
export const AddThreatNoteInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids from getThreats'),
    text: z.string().min(2).max(10000).describe('Note text'),
  })
);
export type AddThreatNoteInput = z.infer<typeof AddThreatNoteInputSchema>;

// getThreatNotes
export const GetThreatNotesInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type GetThreatNotesInput = z.infer<typeof GetThreatNotesInputSchema>;

// downloadThreatFile
export const DownloadThreatFileInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
  })
);
export type DownloadThreatFileInput = z.infer<typeof DownloadThreatFileInputSchema>;

// fetchThreatFile: one threat per request
export const FetchThreatFileInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
    password: z
      .string()
      .min(10)
      .max(256)
      .describe(
        'Password that encrypts the fetched file; the value is saved with the workflow step or agent tool call'
      ),
  })
);
export type FetchThreatFileInput = z.infer<typeof FetchThreatFileInputSchema>;

// getThreatDetails
export const GetThreatDetailsInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(idString(32)).min(1).max(300).describe('Threat ids'),
  })
);
export type GetThreatDetailsInput = z.infer<typeof GetThreatDetailsInputSchema>;

// getThreatTimeline
export const GetThreatTimelineInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
    query: z.string().max(255).optional().describe('Free-text search'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type GetThreatTimelineInput = z.infer<typeof GetThreatTimelineInputSchema>;
