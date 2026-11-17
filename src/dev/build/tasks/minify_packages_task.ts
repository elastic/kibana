/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import { cpus } from 'os';
import type { JsMinifyOptions } from '@swc/core';
import { transform } from '@swc/core';
import { globby } from 'globby';
import { asyncForEachWithLimit } from '@kbn/std';
import type { Task } from '../lib';

// Only strips whitespace and comments other than legal ones: compressing drops inferred function
// and class names, mangling hides local names in errors, and ASCII output keeps V8 source strings
// one-byte.
const STRIP_ONLY: JsMinifyOptions = {
  compress: false,
  mangle: false,
  format: { comments: 'some', asciiOnly: true },
};

// SWC can emit a file's license header after its directives.
const LICENSE_HEADER_RE = /\/\*(?=\r?\n \* Copyright Elasticsearch)[^]*?\*\//;
const toLegalComment = (header: string) => `/*!${header.slice(2)}`;

/** Returns the license header in `source`, if any, marked as a legal comment that minifiers keep. */
export const getLicenseHeader = (source: string): string => {
  const [header] = LICENSE_HEADER_RE.exec(source) ?? [];
  return header ? toLegalComment(header) : '';
};

/** Minifies `file`, updating the source map next to it, if it has one. */
export async function minifyFile(file: string, minify = STRIP_ONLY): Promise<void> {
  const inputSourceMap = await Fsp.readFile(`${file}.map`, 'utf8').catch(() => undefined);
  const source = await Fsp.readFile(file, 'utf8');
  // `minify()` can't take an input source map, while `transform()` emits equivalent code.
  const { code, map } = await transform(source.replace(LICENSE_HEADER_RE, toLegalComment), {
    swcrc: false,
    configFile: false,
    isModule: false,
    inputSourceMap: inputSourceMap ?? false,
    sourceMaps: Boolean(inputSourceMap),
    minify: true,
    jsc: {
      target: 'esnext',
      parser: { syntax: 'ecmascript' },
      minify,
      // Otherwise classes shadowing an outer name are renamed, changing their `name`.
      keepClassNames: minify === STRIP_ONLY,
    },
  });
  await Fsp.writeFile(file, code);
  if (map) {
    await Fsp.writeFile(`${file}.map`, map);
  }
}

export const MinifyPackages: Task = {
  description: 'Minifying package JavaScript',

  async run(config, log, build) {
    const files = await globby(
      config.getDistPackagesFromRepo().map((pkg) => `${pkg.manifest.id}/**/*.js`),
      {
        cwd: build.resolvePath('node_modules'),
        absolute: true,
        // Only a package's top-level `public` is browser code.
        ignore: [
          '@kbn/*/public/**',
          '**/{node_modules,shared_built_assets,target_workers,target_vega_sandbox}/**',
        ],
      }
    );

    await asyncForEachWithLimit(files, cpus().length, (file) => minifyFile(file));

    // Only minified files keep source maps, not browser code or removed files. Shared deps
    // bundles are minified with theirs by GeneratePackagesOptimizedAssets.
    const minifiedMaps = new Set(files.map((file) => `${file}.map`));
    const maps = await globby('**/*.map', {
      cwd: build.resolvePath('node_modules/@kbn'),
      absolute: true,
      dot: true,
      ignore: ['**/shared_built_assets/**'],
    });
    await Promise.all(maps.filter((map) => !minifiedMaps.has(map)).map((map) => Fsp.rm(map)));

    log.info(`Minified ${files.length} files`);
  },
};
