/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { SCOPES } from './constants';
import { errorsOf, falconRequest, listWithDetails, lookupResult, resourcesOf } from './client';
import { sentOutcomes } from './format';
import type {
  ApplyQuarantineFileActionInput,
  DeleteRTRFileInput,
  DeleteRTRScriptInput,
  GetRTRCloudScriptsInput,
  ListQuarantinedFilesInput,
  ListRTRFilesInput,
  UploadRTRFileInput,
  UploadRTRScriptInput,
} from './types';
import {
  ApplyQuarantineFileActionInputSchema,
  DeleteRTRFileInputSchema,
  DeleteRTRScriptInputSchema,
  GetRTRCloudScriptsInputSchema,
  ListQuarantinedFilesInputSchema,
  ListRTRFilesInputSchema,
  UploadRTRFileInputSchema,
  UploadRTRScriptInputSchema,
} from './types';

/** GET an entities route by ids (repeated `ids=` parameters). */
const detailsByIds = (ctx: ActionContext, path: string, scope: string) => (ids: string[]) =>
  falconRequest(ctx, { method: 'GET', path, params: { ids }, retryServerErrors: true, scope });

/** Uploads a multipart form to the RTR library; never retried on 5xx (it creates an item). */
const uploadForm = async (ctx: ActionContext, path: string, form: FormData) => {
  const response = await falconRequest(ctx, {
    method: 'POST',
    path,
    data: form,
    retryServerErrors: false,
    scope: SCOPES.rtrAdmin,
  });
  return {
    resources: resourcesOf(response.data),
    errors: errorsOf(response.data),
    meta: response.data?.meta,
  };
};

/** Deletes one library item by id; idempotent in effect, so 5xx is retried like a read. */
const deleteById = async (ctx: ActionContext, path: string, id: string) => {
  const response = await falconRequest(ctx, {
    method: 'DELETE',
    path,
    params: { ids: id },
    retryServerErrors: true,
    allowNotFound: true,
    scope: SCOPES.rtrAdmin,
  });
  // A file or script that no longer exists is already deleted: notFound, not an error.
  if (response.status === 404) {
    return {
      resources: [],
      errors: errorsOf(response.data),
      meta: response.data?.meta,
      outcomes: [{ id, status: 'notFound' as const }],
    };
  }
  const result = lookupResult(response);
  return { ...result, outcomes: sentOutcomes([id], result.errors) };
};

const page = (input: { filter?: string; limit?: number; offset?: number; sort?: string }) => ({
  filter: input.filter,
  limit: input.limit,
  offset: input.offset === undefined ? undefined : String(input.offset),
  sort: input.sort,
});

export const libraryActions: ConnectorSpec['actions'] = {
  getRTRCloudScripts: {
    isTool: true,
    scope: 'read',
    description:
      'List custom Real Time Response scripts in the cloud library, run with runscript -CloudFile. Returns one page and next_offset.',
    input: GetRTRCloudScriptsInputSchema,
    handler: async (ctx, input: GetRTRCloudScriptsInput) =>
      listWithDetails(ctx, {
        queryPath: '/real-time-response/queries/scripts/v1',
        params: page(input),
        details: detailsByIds(ctx, '/real-time-response/entities/scripts/v2', SCOPES.rtrAdmin),
        scope: SCOPES.rtrAdmin,
      }),
  },
  uploadRTRFile: {
    isTool: false,
    scope: 'write',
    description: 'Upload a file, base64 up to 1 MiB, to the Real Time Response put-file library.',
    input: UploadRTRFileInputSchema,
    handler: async (ctx, input: UploadRTRFileInput) => {
      const form = new FormData();
      form.append('file', new Blob([Buffer.from(input.content_base64, 'base64')]), input.name);
      form.append('name', input.name);
      form.append('description', input.description);
      if (input.comments_for_audit_log) {
        form.append('comments_for_audit_log', input.comments_for_audit_log);
      }
      return uploadForm(ctx, '/real-time-response/entities/put-files/v2', form);
    },
  },
  listRTRFiles: {
    isTool: true,
    scope: 'read',
    description:
      'List the files in the Real Time Response put-file library. Returns one page and next_offset.',
    input: ListRTRFilesInputSchema,
    handler: async (ctx, input: ListRTRFilesInput) =>
      listWithDetails(ctx, {
        queryPath: '/real-time-response/queries/put-files/v1',
        params: page(input),
        details: detailsByIds(ctx, '/real-time-response/entities/put-files/v2', SCOPES.rtrAdmin),
        scope: SCOPES.rtrAdmin,
      }),
  },
  deleteRTRFile: {
    isTool: false,
    scope: 'destroy',
    description:
      'Delete one file from the Real Time Response put-file library. Returns outcome requested or notFound.',
    input: DeleteRTRFileInputSchema,
    handler: async (ctx, input: DeleteRTRFileInput) =>
      deleteById(ctx, '/real-time-response/entities/put-files/v1', input.id),
  },
  uploadRTRScript: {
    isTool: false,
    scope: 'write',
    description: 'Create a custom Real Time Response script for runscript -CloudFile.',
    input: UploadRTRScriptInputSchema,
    handler: async (ctx, input: UploadRTRScriptInput) => {
      const form = new FormData();
      form.append('name', input.name);
      form.append('description', input.description);
      form.append('content', input.content);
      form.append('permission_type', input.permission_type);
      for (const platform of input.platform ?? ['windows']) {
        form.append('platform', platform);
      }
      if (input.comments_for_audit_log) {
        form.append('comments_for_audit_log', input.comments_for_audit_log);
      }
      return uploadForm(ctx, '/real-time-response/entities/scripts/v2', form);
    },
  },
  deleteRTRScript: {
    isTool: false,
    scope: 'destroy',
    description:
      'Delete one custom Real Time Response script. Returns outcome requested or notFound.',
    input: DeleteRTRScriptInputSchema,
    handler: async (ctx, input: DeleteRTRScriptInput) =>
      deleteById(ctx, '/real-time-response/entities/scripts/v1', input.id),
  },
  listQuarantinedFiles: {
    isTool: true,
    scope: 'read',
    description:
      "Search quarantined files by FQL, for example hostname:'web-01', or free text. Returns one page and next_offset.",
    input: ListQuarantinedFilesInputSchema,
    handler: async (ctx, input: ListQuarantinedFilesInput) =>
      listWithDetails(ctx, {
        queryPath: '/quarantine/queries/quarantined-files/v1',
        params: { ...page(input), q: input.q },
        details: (ids) =>
          falconRequest(ctx, {
            method: 'POST',
            path: '/quarantine/entities/quarantined-files/GET/v1',
            data: { ids },
            retryServerErrors: true,
            scope: SCOPES.quarantineRead,
          }),
        scope: SCOPES.quarantineRead,
      }),
  },
  applyQuarantineFileAction: {
    isTool: false,
    scope: 'destroy',
    description: 'Release, unrelease or delete quarantined files by id.',
    input: ApplyQuarantineFileActionInputSchema,
    handler: async (ctx, input: ApplyQuarantineFileActionInput) => {
      const response = await falconRequest(ctx, {
        method: 'PATCH',
        path: '/quarantine/entities/quarantined-files/v1',
        data: { ids: input.ids, action: input.action, comment: input.comment },
        retryServerErrors: false,
        allowNotFound: true,
        scope: SCOPES.quarantineWrite,
      });
      return lookupResult(response);
    },
  },
};
