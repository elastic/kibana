/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { LoaderContext, RawSourceMap } from '@rspack/core';

/** Relative `require.resolve()` calls, which are left as runtime lookups of the module's path. */
export const RELATIVE_REQUIRE_RESOLVE_RE = /\brequire\.resolve\(\s*(["'])(\.\.?\/[^"']+)\1\s*\)/g;

/**
 * Rspack loader that keeps per-module `__dirname`/`__filename`, relative `require.resolve`,
 * and bare-specifier template-literal `import()` behaving as they did in unbundled output.
 */
// eslint-disable-next-line import/no-default-export
export default function bundlePluginServerLoader(
  this: LoaderContext,
  source: string,
  map?: string | RawSourceMap
): void {
  // Calls helpers with names as long as what they replace, so the source map's columns stay accurate.
  source = source
    .replace(/(?<![.\w$])import(?=\(\s*`[^`./][^`]*`\s*\))/g, '__kbnI')
    .replace(RELATIVE_REQUIRE_RESOLVE_RE, (call) => call.replace('require', '__kbnRq'));
  if (!/\b(?:__dirname|__filename|__kbnI|__kbnRq)\b/.test(source)) {
    return this.callback(null, source, map);
  }
  const relFile = Path.relative(this.rootContext, this.resourcePath).replace(/\.[^.]+$/, '.js');
  // A line of its own, which the source map skips.
  const prefix = `const __filename=require("path").join(__kbnBundleDirname,${JSON.stringify(
    relFile
  )}),__dirname=require("path").dirname(__filename),__kbnRq={resolve:(r)=>require.resolve(require("path").resolve(__dirname,r))};function __kbnI(s){return Promise.resolve(s).then((s)=>{const m=__non_webpack_require__(s);return m&&m.__esModule?m:{...m,default:m}})}\n`;
  const sourceMap = typeof map === 'string' ? JSON.parse(map) : map;
  return this.callback(
    null,
    prefix + source,
    sourceMap && { ...sourceMap, mappings: `;${sourceMap.mappings}` }
  );
}
