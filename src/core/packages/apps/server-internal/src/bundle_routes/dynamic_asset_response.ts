/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReadStream } from 'fs';
import { resolve, extname } from 'path';
import { createBrotliCompress, createGzip, constants as zlibConstants } from 'zlib';
import mime from 'mime-types';
import agent from 'elastic-apm-node';

import type { RequestHandler } from '@kbn/core-http-server';
import { fstat, close } from './fs';
import type { IFileHashCache } from './file_hash_cache';
import { getFileHash } from './file_hash';
import { selectCompressedFile } from './select_compressed_file';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function getAcceptedEncodings(acceptEncodingHeader: string): Array<'br' | 'gzip'> {
  if (!acceptEncodingHeader) {
    return [];
  }

  const entries = acceptEncodingHeader
    .split(',')
    .map((part, idx) => {
      const [coding, ...params] = part.trim().toLowerCase().split(';');
      if (coding !== 'br' && coding !== 'gzip' && coding !== 'x-gzip') {
        return undefined;
      }
      let q = 1;
      for (const p of params) {
        const [key, value] = p.split('=').map((s) => s.trim());
        if (key === 'q') {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) q = parsed;
        }
      }
      if (q <= 0) {
        return undefined;
      }
      return { coding: coding === 'x-gzip' ? 'gzip' : (coding as 'br' | 'gzip'), q, idx };
    })
    .filter((x): x is { coding: 'br' | 'gzip'; q: number; idx: number } => x != null)
    .sort((a, b) => {
      if (b.q !== a.q) return b.q - a.q;
      return b.idx - a.idx;
    });

  return entries.map((e) => e.coding);
}

/**
 *  Serve asset for the requested path. This is designed
 *  to replicate a subset of the features provided by Hapi's Inert
 *  plugin including:
 *   - ensure path is not traversing out of the bundle directory
 *   - manage use file descriptors for file access to efficiently
 *     interact with the file multiple times in each request
 *   - generate and cache etag for the file
 *   - write correct headers to response for client-side caching
 *     and invalidation
 *   - stream file to response
 *
 *  It differs from Inert in some important ways:
 *   - cached hash/etag is based on the file on disk, but modified
 *     by the public path so that individual public paths have
 *     different etags, but can share a cache
 */
export const createDynamicAssetHandler = ({
  bundlesPath,
  fileHashCache,
  isDist,
  publicPath,
}: {
  bundlesPath: string;
  publicPath: string;
  fileHashCache: IFileHashCache;
  isDist: boolean;
}): RequestHandler<{ path: string }, {}, {}> => {
  return async (ctx, req, res) => {
    agent.setTransactionName('GET ?/bundles/?');

    let fd: number | undefined;
    let fileEncoding: 'gzip' | 'br' | undefined;

    try {
      const path = resolve(bundlesPath, req.params.path);

      // prevent path traversal, only process paths that resolve within bundlesPath
      if (!path.startsWith(bundlesPath)) {
        return res.forbidden({
          body: 'EACCES',
        });
      }

      // we use and manage a file descriptor mostly because
      // that's what Inert does, and since we are accessing
      // the file 2 or 3 times per request it seems logical
      ({ fd, fileEncoding } = await selectCompressedFile(
        req.headers['accept-encoding'] as string,
        path
      ));

      let headers: Record<string, string>;
      let dynamicEncoding: 'gzip' | 'br' | undefined;
      if (isDist) {
        headers = {
          'cache-control': `public, max-age=${365 * DAY}, immutable`,
        };
      } else {
        const stat = await fstat(fd);
        const hash = await getFileHash(fileHashCache, path, stat, fd);
        headers = {
          etag: `${hash}-${publicPath}`,
          'cache-control': 'must-revalidate',
        };
      }

      // If we manually selected a compressed file, specify the encoding header.
      // Otherwise, apply dynamic compression (Fastify does not auto-compress these streams).
      if (fileEncoding) {
        headers['content-encoding'] = fileEncoding;
      } else {
        const accepted = getAcceptedEncodings((req.headers['accept-encoding'] as string) || '');
        dynamicEncoding = accepted.find((enc) => enc === 'br' || enc === 'gzip');
        if (dynamicEncoding) {
          headers['content-encoding'] = dynamicEncoding;
          headers.vary = 'accept-encoding';
        }
      }

      const fileExt = extname(path);
      const contentType = mime.lookup(fileExt);
      const mediaType = mime.contentType(contentType || fileExt);
      headers['content-type'] = mediaType || '';

      const content = createReadStream(null as any, {
        fd,
        start: 0,
        autoClose: true,
      });
      const body =
        dynamicEncoding === 'gzip'
          ? content.pipe(createGzip())
          : dynamicEncoding === 'br'
          ? content.pipe(
              createBrotliCompress({
                params: {
                  [zlibConstants.BROTLI_PARAM_QUALITY]: 3,
                },
              })
            )
          : content;

      return res.ok({
        body,
        headers,
      });
    } catch (error) {
      if (fd) {
        try {
          await close(fd);
        } catch (_) {
          // ignore errors from close, we already have one to report
          // and it's very likely they are the same
        }
      }
      if (error.code === 'ENOENT') {
        return res.notFound();
      }
      throw error;
    }
  };
};
