/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Fs from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import Boom from 'boom';
import Hapi from 'hapi';

import { FileHashCache } from './file_hash_cache';
import { getFileHash } from './file_hash';
// @ts-ignore
import { replacePlaceholder } from '../public_path_placeholder';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const asyncOpen = promisify(Fs.open);
const asyncClose = promisify(Fs.close);
const asyncFstat = promisify(Fs.fstat);

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
 *   - the PUBLIC_PATH_PLACEHOLDER is replaced with the correct
 *     public path as the response is streamed
 *   - cached hash/etag is based on the file on disk, but modified
 *     by the public path so that individual public paths have
 *     different etags, but can share a cache
 */
export async function createDynamicAssetResponse({
  request,
  h,
  bundlesPath,
  publicPath,
  fileHashCache,
  replacePublicPath,
  isDist,
}: {
  request: Hapi.Request;
  h: Hapi.ResponseToolkit;
  bundlesPath: string;
  publicPath: string;
  fileHashCache: FileHashCache;
  replacePublicPath: boolean;
  isDist: boolean;
}) {
  let fd: number | undefined;

  try {
    const path = resolve(bundlesPath, request.params.path);

    // prevent path traversal, only process paths that resolve within bundlesPath
    if (!path.startsWith(bundlesPath)) {
      throw Boom.forbidden(undefined, 'EACCES');
    }

    // we use and manage a file descriptor mostly because
    // that's what Inert does, and since we are accessing
    // the file 2 or 3 times per request it seems logical
    fd = await asyncOpen(path, 'r');

    const stat = await asyncFstat(fd);
    const hash = isDist ? undefined : await getFileHash(fileHashCache, path, stat, fd);

    const read = Fs.createReadStream(null as any, {
      fd,
      start: 0,
      autoClose: true,
    });
    fd = undefined; // read stream is now responsible for fd

    const content = replacePublicPath ? replacePlaceholder(read, publicPath) : read;

    const response = h
      .response(content)
      .takeover()
      .code(200)
      .type(request.server.mime.path(path).type);

    if (isDist) {
      response.header('cache-control', `max-age=${365 * DAY}`);
    } else {
      response.etag(`${hash}-${publicPath}`);
      response.header('cache-control', 'must-revalidate');
    }

    return response;
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
      throw Boom.notFound();
    }

    throw Boom.boomify(error);
  }
}
