import { isAbsolute, extname } from 'path';

import LruCache from 'lru-cache';

import { createDynamicAssetResponse } from './dynamic_asset_response';

/**
 *  Creates a route that serves files from `bundlesPath`. If the
 *  file is js or css then it is searched for instances of
 *  PUBLIC_PATH_PLACEHOLDER and replaces them with `publicPath`.
 *  @param {Object} options
 *  @property {string} options.bundlesPath
 *  @property {string} options.basePublicPath
 *  @return {Hapi.RouteConfig}
 */
export function createBundlesRoute({ bundlesPath, basePublicPath }) {

  // rather than calculate the fileHash on every request, we
  // provide a cache object to `createDynamicAssetResponse()` that
  // will store the 100 most recently used hashes.
  const fileHashCache = new LruCache(100);

  if (typeof bundlesPath !== 'string' || !isAbsolute(bundlesPath)) {
    throw new TypeError('bundlesPath must be an absolute path to the directory containing the bundles');
  }

  if (typeof basePublicPath !== 'string') {
    throw new TypeError('basePublicPath must be a string');
  }

  if (!basePublicPath.match(/(^$|^\/.*[^\/]$)/)) {
    throw new TypeError('basePublicPath must be empty OR start and not end with a /');
  }

  return {
    method: 'GET',
    path: '/bundles/{path*}',
    config: {
      auth: false,
      ext: {
        onPreHandler: {
          method(request, reply) {
            const ext = extname(request.params.path);
            if (ext !== '.js' && ext !== '.css') {
              return reply.continue();
            }

            reply(createDynamicAssetResponse({
              request,
              bundlesPath,
              fileHashCache,
              publicPath: `${basePublicPath}/bundles/`
            }));
          }
        }
      },
    },
    handler: {
      directory: {
        path: bundlesPath,
        listing: false,
        lookupCompressed: true,
      }
    }
  };
}
