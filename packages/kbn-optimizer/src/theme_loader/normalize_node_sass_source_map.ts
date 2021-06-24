/* eslint-disable @kbn/eslint/require-license-header */

/**
 * Extracted from https://github.com/webpack-contrib/sass-loader/blob/38fa37e99aae3af25d15cc51d37bcdc1b23c7227/src/utils.js#L598-L645 and slightly modified
 *
 * Copyright JS Foundation and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Path from 'path';

const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;
const ABSOLUTE_SCHEME = /^[A-Za-z0-9+\-.]+:/;

function getURLType(source: string) {
  if (source[0] === '/') {
    if (source[1] === '/') {
      return 'scheme-relative' as const;
    }

    return 'path-absolute' as const;
  }

  if (IS_NATIVE_WIN32_PATH.test(source)) {
    return 'path-absolute' as const;
  }

  return ABSOLUTE_SCHEME.test(source) ? ('absolute' as const) : ('path-relative' as const);
}

export function normalizeNodeSassSourceMap(map: Buffer, rootContext: string) {
  const newMap = JSON.parse(map.toString('utf8'));

  // result.map.file is an optional property that provides the output filename.
  // Since we don't know the final filename in the webpack build chain yet, it makes no sense to have it.
  delete newMap.file;

  newMap.sourceRoot = '';

  // node-sass returns POSIX paths, that's why we need to transform them back to native paths.
  // This fixes an error on windows where the source-map module cannot resolve the source maps.
  // @see https://github.com/webpack-contrib/sass-loader/issues/366#issuecomment-279460722
  newMap.sources = newMap.sources.map((source: string) => {
    const sourceType = getURLType(source);

    // Do no touch `scheme-relative`, `path-absolute` and `absolute` types
    if (sourceType === 'path-relative') {
      return Path.resolve(rootContext, Path.normalize(source));
    }

    return source;
  });

  return newMap;
}
