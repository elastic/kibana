/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-emulate';
import { isRecord } from '../values';

/** Where a path, or an operation on it, is in a spec. */
export type OperationLocation =
  | { readonly status: 'present' }
  /**
   * Under a shorter path, with the rest of the old one now at the end of a server URL, so the
   * full URL is the same: `/api/0/issues/` became `/issues/` under `https://sentry.io/api/0`.
   */
  | { readonly status: 'moved'; readonly path: string; readonly serverPath: string }
  | { readonly status: 'missing' };

/** The spec's server URLs, as written. */
export const serverUrls = (document: OpenApiDocument): string[] =>
  (Array.isArray(document.servers) ? document.servers : []).flatMap((server) =>
    isRecord(server) && typeof server.url === 'string' ? [server.url] : []
  );

// The path part of each server URL (`/api/0` of `https://{region}.sentry.io/api/0`), if any.
const serverPaths = (document: OpenApiDocument): string[] => [
  ...new Set(
    serverUrls(document)
      .map((url) => url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '').replace(/\/+$/, ''))
      .filter((serverPath) => serverPath !== '')
  ),
];

// Azure specs keep the paths that differ only in their query in `x-ms-paths`.
const pathItem = (document: OpenApiDocument, path: string): Record<string, unknown> | undefined => {
  for (const key of ['paths', 'x-ms-paths']) {
    const paths = document[key];
    const item = isRecord(paths) ? paths[path] : undefined;
    if (isRecord(item)) {
      return item;
    }
  }
  return undefined;
};

const has = (document: OpenApiDocument, path: string, method?: string): boolean => {
  const item = pathItem(document, path);
  return item !== undefined && (method === undefined || method.toLowerCase() in item);
};

/**
 * Finds a path, and the operation on it when a method is given, in a spec: where it was, or under
 * a path that a server URL's own path now precedes, which keeps the full URL.
 */
export const locateOperation = (
  document: OpenApiDocument,
  path: string,
  method?: string
): OperationLocation => {
  if (has(document, path, method)) {
    return { status: 'present' };
  }
  for (const serverPath of serverPaths(document)) {
    if (path.startsWith(`${serverPath}/`)) {
      const moved = path.slice(serverPath.length);
      if (has(document, moved, method)) {
        return { status: 'moved', path: moved, serverPath };
      }
    }
  }
  return { status: 'missing' };
};
