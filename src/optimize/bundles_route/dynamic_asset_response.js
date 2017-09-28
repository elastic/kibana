import { resolve } from 'path';
import { open, fstat, createReadStream, close } from 'fs';

import Boom from 'boom';
import { fromNode as fcb } from 'bluebird';

import { getFileHash } from './file_hash';
import { replacePlaceholder } from '../public_path_placeholder';

/**
 *  Create a Hapi response for the requested path
 *  @param {Object} options
 *  @property {Hapi.Request} options.request
 *  @property {string} options.bundlesPath
 *  @property {string} options.publicPath
 *  @property {LruCache} options.fileHashCache
 */
export async function createDynamicAssetResponse(options) {
  const {
    request,
    bundlesPath,
    publicPath,
    fileHashCache,
  } = options;

  let fd;
  try {
    const path = resolve(bundlesPath, request.params.path);

    // prevent path traversal, only process paths that resolve within bundlesPath
    if (!path.startsWith(bundlesPath)) {
      return Boom.forbidden(null, 'EACCES');
    }

    // we use and manage a file descriptor mostly because
    // that's what Inert does, and since we are accessing
    // the file 2 or 3 times per request it seems logical
    fd = await fcb(cb => open(path, 'r', cb));

    const stat = await fcb(cb => fstat(fd, cb));
    const hash = await getFileHash(fileHashCache, path, stat, fd);

    const read = createReadStream(null, {
      fd,
      start: 0,
      autoClose: true
    });
    fd = null; // read stream is now responsible for fd

    const response = request.generateResponse(replacePlaceholder(read, publicPath));
    response.code(200);
    response.etag(`${hash}-${publicPath}`);
    response.header('last-modified', stat.mtime.toUTCString());
    response.type(request.server.mime.path(path).type);
    return response;

  } catch (error) {
    if (fd) {
      try {
        await fcb(cb => close(fd, cb));
      } catch (error) {
        // ignore errors from close, we already have one to report
        // and it's very likely they are the same
      }
    }

    if (error.code === 'ENOENT') {
      return Boom.notFound();
    }

    return Boom.boomify(error);
  }
}
