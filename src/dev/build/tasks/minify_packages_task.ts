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

// Only strips whitespace and comments: compressing drops inferred function and class names,
// mangling hides local names in errors, and ASCII output keeps V8 source strings one-byte.
const STRIP_ONLY: JsMinifyOptions = {
  compress: false,
  mangle: false,
  format: { comments: false, asciiOnly: true },
};

/** Minifies `file`, updating the source map next to it, if it has one. */
export async function minifyFile(file: string, minify = STRIP_ONLY): Promise<void> {
  const inputSourceMap = await Fsp.readFile(`${file}.map`, 'utf8').catch(() => undefined);
  // `minify()` can't take an input source map, while `transform()` emits equivalent code.
  const { code, map } = await transform(await Fsp.readFile(file, 'utf8'), {
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
      keepClassNames: true,
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
        ignore: [
          '**/{node_modules,public,shared_built_assets,target_workers,target_vega_sandbox}/**',
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
