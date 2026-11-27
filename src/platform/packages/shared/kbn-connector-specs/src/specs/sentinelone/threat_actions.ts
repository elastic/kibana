/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { assertApplied, downloadFile, requireIds, s1Request, toListResult } from './client';
import { ACTION_DESCRIPTIONS } from './descriptions';
import {
  AddThreatNoteInputSchema,
  DownloadThreatFileInputSchema,
  FetchThreatFileInputSchema,
  GetThreatDetailsInputSchema,
  GetThreatNotesInputSchema,
  GetThreatTimelineInputSchema,
  GetThreatsInputSchema,
  MitigateThreatInputSchema,
  RollbackThreatInputSchema,
  UpdateThreatStatusInputSchema,
  UpdateThreatVerdictInputSchema,
} from './threat_types';
import type {
  AddThreatNoteInput,
  DownloadThreatFileInput,
  FetchThreatFileInput,
  GetThreatDetailsInput,
  GetThreatNotesInput,
  GetThreatTimelineInput,
  GetThreatsInput,
  MitigateThreatInput,
  RollbackThreatInput,
  UpdateThreatStatusInput,
  UpdateThreatVerdictInput,
} from './threat_types';

const EMPTY_THREAT_IDS =
  'threatIds must list at least one threat id (an empty filter would target every threat)';

/** Every threat write sends `{ filter: { ids }, data? }` and fails on per-item errors or affected = 0. */
const threatBulkAction = async (
  ctx: ActionContext,
  action: string,
  path: string,
  threatIds: string[],
  data?: Record<string, unknown>
) => {
  const ids = requireIds(threatIds, EMPTY_THREAT_IDS);
  const body = await s1Request(ctx, {
    action,
    method: 'POST',
    path,
    body: { filter: { ids }, ...(data ? { data } : {}) },
    mutating: true,
  });
  return assertApplied(action, ids, body);
};

export const threatActions: ConnectorSpec['actions'] = {
  getThreats: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getThreats,
    input: GetThreatsInputSchema,
    handler: async (ctx, input: GetThreatsInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'getThreats',
          method: 'GET',
          path: '/threats',
          params: input,
          mutating: false,
        })
      ),
  },

  getThreatDetails: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getThreatDetails,
    input: GetThreatDetailsInputSchema,
    handler: async (ctx, input: GetThreatDetailsInput) => {
      const ids = requireIds(input.ids, 'ids must list at least one threat id');
      return toListResult(
        await s1Request(ctx, {
          action: 'getThreatDetails',
          method: 'GET',
          path: '/threats',
          params: { ids, limit: ids.length },
          mutating: false,
        })
      );
    },
  },

  getThreatNotes: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getThreatNotes,
    input: GetThreatNotesInputSchema,
    handler: async (ctx, input: GetThreatNotesInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'getThreatNotes',
          method: 'GET',
          path: `/threats/${encodeURIComponent(input.threatId)}/notes`,
          params: { limit: input.limit, cursor: input.cursor },
          mutating: false,
        })
      ),
  },

  getThreatTimeline: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getThreatTimeline,
    input: GetThreatTimelineInputSchema,
    handler: async (ctx, input: GetThreatTimelineInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'getThreatTimeline',
          method: 'GET',
          path: `/threats/${encodeURIComponent(input.threatId)}/timeline`,
          params: { query: input.query, limit: input.limit, cursor: input.cursor },
          mutating: false,
        })
      ),
  },

  mitigateThreat: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.mitigateThreat,
    input: MitigateThreatInputSchema,
    handler: async (ctx, input: MitigateThreatInput) =>
      threatBulkAction(
        ctx,
        'mitigateThreat',
        `/threats/mitigate/${encodeURIComponent(input.action)}`,
        input.threatIds
      ),
  },

  rollbackThreat: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.rollbackThreat,
    input: RollbackThreatInputSchema,
    handler: async (ctx, input: RollbackThreatInput) =>
      threatBulkAction(
        ctx,
        'rollbackThreat',
        '/threats/mitigate/rollback-remediation',
        input.threatIds
      ),
  },

  updateThreatVerdict: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.updateThreatVerdict,
    input: UpdateThreatVerdictInputSchema,
    handler: async (ctx, input: UpdateThreatVerdictInput) =>
      threatBulkAction(ctx, 'updateThreatVerdict', '/threats/analyst-verdict', input.threatIds, {
        analystVerdict: input.analystVerdict,
      }),
  },

  updateThreatStatus: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.updateThreatStatus,
    input: UpdateThreatStatusInputSchema,
    handler: async (ctx, input: UpdateThreatStatusInput) =>
      threatBulkAction(ctx, 'updateThreatStatus', '/threats/incident', input.threatIds, {
        incidentStatus: input.incidentStatus,
        ...(input.analystVerdict ? { analystVerdict: input.analystVerdict } : {}),
      }),
  },

  addThreatNote: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.addThreatNote,
    input: AddThreatNoteInputSchema,
    handler: async (ctx, input: AddThreatNoteInput) =>
      threatBulkAction(ctx, 'addThreatNote', '/threats/notes', input.threatIds, {
        text: input.text,
      }),
  },

  downloadThreatFile: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.downloadThreatFile,
    input: DownloadThreatFileInputSchema,
    handler: async (ctx, input: DownloadThreatFileInput) => {
      const body = await s1Request(ctx, {
        action: 'downloadThreatFile',
        method: 'GET',
        path: `/threats/${encodeURIComponent(input.threatId)}/download-from-cloud`,
        mutating: false,
      });
      const data = body.data as { downloadUrl?: unknown; fileName?: unknown } | undefined;
      const downloadUrl = typeof data?.downloadUrl === 'string' ? data.downloadUrl : '';
      if (!downloadUrl) {
        throw new Error(`No file download link for threat [${input.threatId}]`);
      }
      const file = await downloadFile(ctx, {
        action: 'downloadThreatFile',
        link: downloadUrl,
        fallbackName: typeof data?.fileName === 'string' ? data.fileName : '',
      });
      // the pre-signed link is not returned (it can embed a temporary security token); the file content is
      return { ...file, threatId: input.threatId };
    },
  },

  fetchThreatFile: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.fetchThreatFile,
    input: FetchThreatFileInputSchema,
    handler: async (ctx, input: FetchThreatFileInput) => {
      const body = await s1Request(ctx, {
        action: 'fetchThreatFile',
        method: 'POST',
        path: '/threats/fetch-file',
        body: { data: { password: input.password }, filter: { ids: [input.threatId] } },
        mutating: true,
      });
      return assertApplied('fetchThreatFile', [input.threatId], body);
    },
  },
};
