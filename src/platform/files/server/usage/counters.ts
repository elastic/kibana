/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getCounters(fileKind: string) {
  return {
    DELETE: `delete:${fileKind}`,
    DELETE_ERROR: `delete:error:unknown:${fileKind}`,
    DELETE_ERROR_NOT_FOUND: `delete:error:not_found:${fileKind}`,

    SHARE: `share:${fileKind}`,
    SHARE_ERROR: `share:error:unknown:${fileKind}`,
    SHARE_ERROR_EXPIRATION_IN_PAST: `share:error:expiration_in_past:${fileKind}`,
    SHARE_ERROR_FORBIDDEN: `share:error:forbidden:${fileKind}`,
    SHARE_ERROR_CONFLICT: `share:error:conflict:${fileKind}`,

    UNSHARE: `unshare:${fileKind}`,
    UNSHARE_ERROR: `unshare:error:unknown:${fileKind}`,
    UNSHARE_ERROR_NOT_FOUND: `unshare:error:not_found:${fileKind}`,

    DOWNLOAD: `download:${fileKind}`,
    DOWNLOAD_ERROR: `download:error:unknown:${fileKind}`,

    UPLOAD_ERROR_ABORT: `upload:error:abort:${fileKind}`,
  };
}

export type Counters = keyof ReturnType<typeof getCounters>;
