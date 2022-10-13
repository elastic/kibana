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

import * as babel from '@babel/core';
import { addHook } from 'pirates';
import { REPO_ROOT, UPSTREAM_BRANCH } from '@kbn/utils';
import sourceMapSupport from 'source-map-support';

import { Cache } from './cache';

const cwd = process.cwd();

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

function getBabelOptions(path: string) {
  return babel.loadOptions({
    cwd,
    sourceRoot: Path.dirname(path) + Path.sep,
    filename: path,
    babelrc: false,
    presets: [require.resolve('@kbn/babel-preset/node_preset')],
    sourceMaps: 'both',
    ast: false,
  })!;
}

/**
 * @babel/register uses a JSON encoded copy of the config + babel.version
 * as the cache key for files, so we do something similar but we don't need
 * a unique cache key for every file as our config isn't different for
 * different files (by design). Instead we determine a unique prefix and
 * automatically prepend all paths with the prefix to create cache keys
 */
function determineCachePrefix() {
  const json = JSON.stringify({
    babelVersion: babel.version,
    // get a config for a fake js, ts, and tsx file to make sure we
    // capture conditional config portions based on the file extension
    js: getBabelOptions(Path.resolve(REPO_ROOT, 'foo.js')),
    ts: getBabelOptions(Path.resolve(REPO_ROOT, 'foo.ts')),
    tsx: getBabelOptions(Path.resolve(REPO_ROOT, 'foo.tsx')),
  });

  const checksum = Crypto.createHash('sha256').update(json).digest('hex').slice(0, 8);
  return `${checksum}:`;
}

function compile(cache: Cache, source: string, path: string) {
  try {
    const mtime = `${Fs.statSync(path).mtimeMs}`;
    if (cache.getMtime(path) === mtime) {
      const code = cache.getCode(path);
      if (code) {
        // code *should* always be defined, but if it isn't for some reason rebuild it
        return code;
      }
    }

    const options = getBabelOptions(path);
    const result = babel.transform(source, options);

    if (!result || !result.code || !result.map) {
      throw new Error(`babel failed to transpile [${path}]`);
    }

    cache.update(path, {
      mtime,
      map: result.map,
      code: result.code,
    });

    return result.code;
  } catch (error) {
    throw error;
  }
}

let installed = false;

export function registerNodeAutoTranspilation() {
  if (installed) {
    return;
  }
  installed = true;

  const cache = new Cache({
    pathRoot: REPO_ROOT,
    dir: Path.resolve(REPO_ROOT, 'data/node_auto_transpilation_cache_v3', UPSTREAM_BRANCH),
    prefix: determineCachePrefix(),
    log: process.env.DEBUG_NODE_TRANSPILER_CACHE
      ? Fs.createWriteStream(Path.resolve(REPO_ROOT, 'node_auto_transpilation_cache.log'), {
          flags: 'a',
        })
      : undefined,
  });

  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: 'node',
    // @ts-expect-error bad source-map-support types
    retrieveSourceMap(path: string) {
      const map = cache.getSourceMap(path);

      if (map) {
        return {
          url: null,
          map,
        };
      } else {
        return null;
      }
    },
  });

  let compiling = false;

  addHook(
    (code, path) => {
      if (compiling) {
        return code;
      }

      if (IGNORE_PATTERNS.some((re) => re.test(path))) {
        return code;
      }

      try {
        compiling = true;
        return compile(cache, code, path);
      } finally {
        compiling = false;
      }
    },
    {
      exts: ['.js', '.ts', '.tsx'],
      ignoreNodeModules: false,
    }
  );

  // require the polyfills after setting up the require hook so that @babel/preset-env
  // will spot the import in the polyfill file and replace it with the necessary polyfills
  // for the current node.js version
  require('./polyfill');
}
