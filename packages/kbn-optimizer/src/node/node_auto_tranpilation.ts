/* eslint-disable @kbn/eslint/require-license-header */

/**
 * This module is based on @babel/register @ 9808d25, modified to use
 * a more efficient caching implementation which writes to disk as
 * the cache is built rather than keeping the whole cache in memory
 * and then dumping it to disk when the process exits.
 */

/**
 * @notice
 * MIT License
 *
 * Copyright (c) 2014-present Sebastian McKenzie and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Fs from 'fs';
import Path from 'path';
import Crypto from 'crypto';

import { version as babelVersion } from '@babel/core';
import { VERSION as peggyVersion } from '@kbn/peggy';
import { addHook } from 'pirates';
import { REPO_ROOT, UPSTREAM_BRANCH } from '@kbn/utils';
import sourceMapSupport from 'source-map-support';
import { readHashOfPackageMap } from '@kbn/synthetic-package-map';

import { TRANSFORMS } from './transforms';
import { getBabelOptions } from './transforms/babel';

import { Cache } from './cache';

const IGNORE_PATTERNS = [
  /[\/\\]kbn-pm[\/\\]dist[\/\\]/,

  // ignore paths matching `/node_modules/{a}/{b}`, unless `a`
  // is `x-pack` and `b` is not `node_modules`
  /[\/\\]node_modules[\/\\](?!x-pack[\/\\](?!node_modules)([^\/\\]+))([^\/\\]+[\/\\][^\/\\]+)/,

  // ignore paths matching `/canvas/canvas_plugin/`
  /[\/\\]canvas[\/\\]canvas_plugin[\/\\]/,

  // ignore any path in the packages, unless it is in the package's
  // root `src` directory, in any test or __tests__ directory, or it
  // ends with .test.js, .test.ts, or .test.tsx
  /[\/\\]packages[\/\\](eslint-|kbn-)[^\/\\]+[\/\\](?!src[\/\\].*|(.+[\/\\])?(test|__tests__)[\/\\].+|.+\.test\.(js|ts|tsx)$)(.+$)/,
];

let installed = false;

export function registerNodeAutoTranspilation() {
  if (installed) {
    return;
  }
  installed = true;

  const cacheLog = process.env.DEBUG_NODE_TRANSPILER_CACHE
    ? Fs.createWriteStream(Path.resolve(REPO_ROOT, 'node_auto_transpilation_cache.log'))
    : undefined;

  const cacheDir = Path.resolve(
    REPO_ROOT,
    'data/node_auto_transpilation_cache_v6',
    UPSTREAM_BRANCH
  );

  /**
   * @babel/register uses a JSON encoded copy of the config + babel.version
   * as the cache key for files, so we do something similar but we don't need
   * a unique cache key for every file as our config isn't different for
   * different files (by design). Instead we determine a unique prefix and
   * automatically prepend all paths with the prefix to create cache keys
   */

  const cache = new Cache({
    dir: cacheDir,
    log: cacheLog,
    pathRoot: REPO_ROOT,
    prefix: Crypto.createHash('sha256')
      .update(
        JSON.stringify({
          synthPkgMapHash: readHashOfPackageMap(),
          babelVersion,
          peggyVersion,
          // get a config for a fake js, ts, and tsx file to make sure we
          // capture conditional config portions based on the file extension
          js: getBabelOptions(Path.resolve(REPO_ROOT, 'foo.js')),
          ts: getBabelOptions(Path.resolve(REPO_ROOT, 'foo.ts')),
          tsx: getBabelOptions(Path.resolve(REPO_ROOT, 'foo.tsx')),
        })
      )
      .digest('hex')
      .slice(0, 8),
  });
  cacheLog?.write(`cache initialized\n`);

  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: 'node',
    // @ts-expect-error bad source-map-support types
    retrieveSourceMap(path: string) {
      const map = cache.getSourceMap(path);
      return map ? { map, url: null } : null;
    },
  });

  let transformInProgress = false;
  addHook(
    (code, path) => {
      if (transformInProgress) {
        return code;
      }

      const ext = Path.extname(path);

      if (ext !== '.peggy' && IGNORE_PATTERNS.some((re) => re.test(path))) {
        return code;
      }

      try {
        transformInProgress = true;
        const transform = Object.hasOwn(TRANSFORMS, ext)
          ? TRANSFORMS[ext as keyof typeof TRANSFORMS]
          : TRANSFORMS.default;

        return transform(path, code, cache);
      } finally {
        transformInProgress = false;
      }
    },
    {
      exts: ['.js', '.ts', '.tsx', '.peggy'],
      ignoreNodeModules: false,
    }
  );

  // require the polyfills after setting up the require hook so that @babel/preset-env
  // will spot the import in the polyfill file and replace it with the necessary polyfills
  // for the current node.js version
  require('./polyfill');
}
