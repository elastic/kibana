/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import { resolve, extname } from 'path';
import mime from 'mime-types';
import { promisify } from 'util';
import Accept from 'accept';

import agent from 'elastic-apm-node';
import { RequestHandler } from '../../http';
import { FileHashCache } from './file_hash_cache';
import { getFileHash } from './file_hash';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const asyncOpen = promisify(Fs.open);
const asyncClose = promisify(Fs.close);
const asyncFstat = promisify(Fs.fstat);

declare module 'accept' {
  // @types/accept does not include the `preferences` argument so we override the type to include it
  export function encodings(encodingHeader?: string, preferences?: string[]): string[];
}

async function tryToOpenFile(filePath: string) {
  try {
    return await asyncOpen(filePath, 'r');
  } catch (e) {
    if (e.code === 'ENOENT') {
      return undefined;
    } else {
      throw e;
    }
  }
}

async function selectCompressedFile(acceptEncodingHeader: string | undefined, path: string) {
  let fd: number | undefined;
  let fileEncoding: 'gzip' | 'br' | undefined;
  const ext = extname(path);

  const supportedEncodings = Accept.encodings(acceptEncodingHeader, ['br', 'gzip']);

  if (ext === '.js' || ext === '.css') {
    if (supportedEncodings[0] === 'br') {
      fileEncoding = 'br';
      fd = await tryToOpenFile(`${path}.br`);
    }
    if (!fd && supportedEncodings.includes('gzip')) {
      fileEncoding = 'gzip';
      fd = await tryToOpenFile(`${path}.gz`);
    }
  }

  if (!fd) {
    fileEncoding = undefined;
    // Use raw open to trigger exception if it does not exist
    fd = await asyncOpen(path, 'r');
  }

  return { fd, fileEncoding };
}

/**
 *  Create a Hapi response for the requested path. This is designed
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
  fileHashCache: FileHashCache;
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
      if (isDist) {
        headers = { 'cache-control': `max-age=${365 * DAY}` };
      } else {
        const stat = await asyncFstat(fd);
        const hash = await getFileHash(fileHashCache, path, stat, fd);
        headers = {
          etag: `${hash}-${publicPath}`,
          'cache-control': 'must-revalidate',
        };
      }
      // If we manually selected a compressed file, specify the encoding header.
      // Otherwise, let Hapi automatically gzip the response.
      if (fileEncoding) {
        headers['content-encoding'] = fileEncoding;
      }

      const fileExt = extname(path);
      const contentType = mime.lookup(fileExt);
      const mediaType = mime.contentType(contentType || fileExt);
      headers['content-type'] = mediaType || '';

      const content = Fs.createReadStream(null as any, {
        fd,
        start: 0,
        autoClose: true,
      });
      fd = undefined; // read stream is now responsible for fd

      return res.ok({
        body: content,
        headers,
      });
    } catch (error) {
      if (fd) {
        try {
          await asyncClose(fd);
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
