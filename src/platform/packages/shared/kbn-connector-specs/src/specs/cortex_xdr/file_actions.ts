/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  CortexXdrError,
  endpointIdFilter,
  getApiBase,
  isConfirmed,
  notConfirmedError,
  toInteger,
  xdrPost,
  xdrRequest,
} from './client';
import { API_PREFIX } from './constants';
import {
  GetQuarantineStatusInputSchema,
  GetRetrievedFileDetailsInputSchema,
  HashListInputSchema,
  QuarantineFileInputSchema,
  RestoreFileInputSchema,
  RetrieveFileInputSchema,
} from './types';
import type {
  GetQuarantineStatusInput,
  GetRetrievedFileDetailsInput,
  HashListInput,
  QuarantineFileInput,
  RestoreFileInput,
  RetrieveFileInput,
} from './types';

const changeHashList =
  (route: '/hash_exceptions/blocklist' | '/hash_exceptions/allowlist') =>
  async (ctx: ActionContext, input: HashListInput) => {
    const body = await xdrPost(
      ctx,
      route,
      {
        hash_list: input.hashList,
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
        ...(input.caseId !== undefined ? { incident_id: input.caseId } : {}),
      },
      { stateChanging: true }
    );
    if (!isConfirmed(body)) throw notConfirmedError(body);
    return { success: true, hashCount: input.hashList.length };
  };

const DOWNLOAD_PATH = new RegExp(`^${API_PREFIX.replace(/\//g, '\\/')}\\/download\\/([^/]+)$`);

/**
 * The download route of a retrieval link, or undefined when the link is not a download route on
 * the configured API host. The link comes from the response, so it is never requested as given:
 * the connector requests its own URL for the route, which keeps the key headers on that host.
 */
export const toDownloadRoute = (ctx: ActionContext, link: unknown): string | undefined => {
  if (typeof link !== 'string' || link.length === 0) return undefined;
  const base = new URL(getApiBase(ctx));
  let resolved: URL;
  try {
    resolved = new URL(link, base);
  } catch {
    return undefined;
  }
  if (resolved.origin !== base.origin || resolved.search || resolved.hash) return undefined;
  const match = DOWNLOAD_PATH.exec(resolved.pathname);
  if (!match || match[1] === '.' || match[1] === '..') return undefined;
  return `/download/${match[1]}`;
};

interface RetrievedFile {
  endpointId: string;
  downloadRoute: string | null;
  downloaded: boolean;
  sizeBytes?: number;
  contentBase64?: string;
  skippedReason?: string;
}

const toRetrievedFile = (ctx: ActionContext, endpointId: string, link: unknown): RetrievedFile => {
  const downloadRoute = toDownloadRoute(ctx, link) ?? null;
  const hasLink = link !== null && link !== undefined && link !== '';
  return {
    endpointId,
    downloadRoute,
    downloaded: false,
    ...(downloadRoute || !hasLink
      ? {}
      : { skippedReason: 'the download link is not a download route on the configured API host' }),
  };
};

const DOWNLOAD_ATTEMPTS = 2;

/**
 * Downloads one archive. A transfer cut before the body arrived (no HTTP status) is tried once
 * more; an archive above maxBytes is not returned.
 */
const downloadArchive = async (
  ctx: ActionContext,
  file: RetrievedFile,
  maxBytes: number
): Promise<RetrievedFile> => {
  if (!file.downloadRoute) return file;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await xdrRequest<ArrayBuffer>(ctx, {
        path: file.downloadRoute,
        responseType: 'arraybuffer',
        maxResponseBytes: maxBytes,
      });
      const content = Buffer.from(response.data);
      if (content.byteLength > maxBytes) {
        return {
          ...file,
          sizeBytes: content.byteLength,
          skippedReason: 'larger than maxDownloadSizeBytes',
        };
      }
      return {
        ...file,
        downloaded: true,
        sizeBytes: content.byteLength,
        contentBase64: content.toString('base64'),
      };
    } catch (error) {
      if (error instanceof CortexXdrError && error.budgetExceeded) {
        return { ...file, skippedReason: "not downloaded: the action's time budget is spent" };
      }
      if (error instanceof CortexXdrError && error.tooLarge) {
        return { ...file, skippedReason: 'larger than maxDownloadSizeBytes' };
      }
      if (
        error instanceof CortexXdrError &&
        error.status !== undefined &&
        (error.status === 404 || error.status >= 500)
      ) {
        return { ...file, skippedReason: `the archive could not be downloaded: ${error.message}` };
      }
      const cut = error instanceof CortexXdrError && error.status === undefined;
      if (!cut || attempt >= DOWNLOAD_ATTEMPTS) throw error;
      ctx.log.debug(`Cortex XDR archive download was cut; retry ${attempt}`);
    }
  }
};

export const fileActions: ConnectorSpec['actions'] = {
  quarantineFile: {
    isTool: false,
    scope: 'destroy',
    description:
      'Quarantine a file (path and SHA256) on endpoints. Returns reply.action_id for getActionStatus and reply.endpoints_count (unknown ids are not listed); check the result with getQuarantineStatus. Undo with restoreFile.',
    input: QuarantineFileInputSchema,
    handler: async (ctx, input: QuarantineFileInput) =>
      xdrPost(
        ctx,
        '/endpoints/quarantine',
        {
          filters: endpointIdFilter(input.endpointIds),
          file_path: input.filePath,
          file_hash: input.fileHash,
        },
        { stateChanging: true }
      ),
  },
  restoreFile: {
    isTool: true,
    scope: 'write',
    description:
      'Restore a quarantined file by SHA256, on one endpoint or, without endpointId, on every endpoint holding it. Returns reply.action_id for getActionStatus.',
    input: RestoreFileInputSchema,
    handler: async (ctx, input: RestoreFileInput) =>
      xdrPost(
        ctx,
        '/endpoints/restore',
        {
          file_hash: input.fileHash,
          ...(input.endpointId ? { endpoint_id: input.endpointId } : {}),
          ...(input.caseId !== undefined ? { incident_id: input.caseId } : {}),
        },
        { stateChanging: true }
      ),
  },
  getQuarantineStatus: {
    isTool: true,
    scope: 'read',
    description:
      'Check whether files are quarantined: one file (endpointId, fileHash, optional filePath) or several in files. Returns reply[] with status true when the file is quarantined.',
    input: GetQuarantineStatusInputSchema,
    handler: async (ctx, input: GetQuarantineStatusInput) => {
      const files = input.files ?? [
        { endpointId: input.endpointId, fileHash: input.fileHash, filePath: input.filePath },
      ];
      return xdrPost(ctx, '/quarantine/status', {
        files: files.map((file) => ({
          endpoint_id: file.endpointId,
          file_hash: file.fileHash,
          ...(file.filePath ? { file_path: file.filePath } : {}),
        })),
      });
    },
  },
  blocklistFiles: {
    isTool: true,
    scope: 'write',
    description:
      'Add SHA256 hashes to the tenant-wide block list so the files cannot run. Returns success true once Cortex XDR confirms. Entries are removed in the Cortex XDR console.',
    input: HashListInputSchema,
    handler: async (ctx, input: HashListInput) =>
      changeHashList('/hash_exceptions/blocklist')(ctx, input),
  },
  allowlistFiles: {
    isTool: false,
    scope: 'write',
    description:
      'Add SHA256 hashes to the tenant-wide allow list. Returns success true once Cortex XDR confirms. Entries are removed in the Cortex XDR console.',
    input: HashListInputSchema,
    handler: async (ctx, input: HashListInput) =>
      changeHashList('/hash_exceptions/allowlist')(ctx, input),
  },
  retrieveFile: {
    isTool: true,
    scope: 'write',
    description:
      'Collect files from 1-10 endpoints (up to 20 paths, listed per operating system). Returns reply.action_id: wait for getActionStatus to show COMPLETED_SUCCESSFULLY, then call getRetrievedFileDetails.',
    input: RetrieveFileInputSchema,
    handler: async (ctx, input: RetrieveFileInput) => {
      const files = Object.fromEntries(
        (
          [
            ['windows', input.windowsPaths],
            ['linux', input.linuxPaths],
            ['macos', input.macosPaths],
          ] as const
        ).filter(([, paths]) => paths && paths.length > 0)
      );
      return xdrPost(
        ctx,
        '/endpoints/file_retrieval',
        {
          filters: endpointIdFilter(input.endpointIds),
          files,
          ...(input.caseId ? { incident_id: input.caseId } : {}),
        },
        { stateChanging: true }
      );
    },
  },
  getRetrievedFileDetails: {
    isTool: true,
    scope: 'read',
    description:
      'Get the archives of a retrieveFile action by its action id; ready is false until the retrieval finishes. With download true, archives up to maxDownloadSizeBytes are returned base64-encoded in files[].contentBase64 (a large payload).',
    input: GetRetrievedFileDetailsInputSchema,
    handler: async (ctx, input: GetRetrievedFileDetailsInput) => {
      const body = await xdrPost<{ reply?: { data?: Record<string, unknown> } }>(
        ctx,
        '/actions/file_retrieval_details',
        { group_action_id: String(toInteger(input.actionId)) }
      );
      const listed = Object.entries(body.reply?.data ?? {}).map(([endpointId, link]) =>
        toRetrievedFile(ctx, endpointId, link)
      );
      const files: RetrievedFile[] = [];
      for (const file of listed) {
        // One at a time: each archive can be large and the tenant allows 10 requests a second.
        files.push(
          input.download && file.downloadRoute
            ? await downloadArchive(ctx, file, input.maxDownloadSizeBytes)
            : file
        );
      }
      // The vendor links stay out of the result: files[] carries each endpoint's checked route.
      const reply = body.reply
        ? Object.fromEntries(Object.entries(body.reply).filter(([key]) => key !== 'data'))
        : null;
      return {
        // Ready once every endpoint has a download route, not when the first one has.
        ready: files.length > 0 && files.every((file) => file.downloadRoute !== null),
        reply,
        files,
      };
    },
  },
};
