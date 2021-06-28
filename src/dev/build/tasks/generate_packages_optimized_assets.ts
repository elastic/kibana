/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipeline } from 'stream';
import { promisify } from 'util';

// @ts-expect-error
import gulpPostCSS from 'gulp-postcss';
// @ts-expect-error
import gulpTerser from 'gulp-terser';
import terser from 'terser';
import vfs from 'vinyl-fs';

import { Task, Build } from '../lib';

const asyncPipeline = promisify(pipeline);

const minifyKbnUiSharedDepsCSS = async (build: Build) => {
  const buildRoot = build.resolvePath();

  await asyncPipeline(
    vfs.src(['node_modules/@kbn/ui-shared-deps/shared_built_assets/**/*.css'], {
      cwd: buildRoot,
    }),

    gulpPostCSS([
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cssnano')({
        preset: [
          'default',
          {
            discardComments: false,
          },
        ],
      }),
    ]),

    vfs.dest(buildRoot)
  );
};

const minifyKbnUiSharedDepsJS = async (build: Build) => {
  const buildRoot = build.resolvePath();

  await asyncPipeline(
    vfs.src(['node_modules/@kbn/ui-shared-deps/shared_built_assets/**/*.js'], {
      cwd: buildRoot,
    }),

    gulpTerser(
      {
        compress: true,
        mangle: true,
      },
      terser.minify
    ),

    vfs.dest(buildRoot)
  );
};

const generateKbnUiSharedDepsOptimizedAssets = async (build: Build) => {
  await minifyKbnUiSharedDepsCSS(build);
  await minifyKbnUiSharedDepsJS(build);
};

export const GeneratePackagesOptimizedAssets: Task = {
  description: 'Generate Optimized Assets for Packages',

  async run(config, log, build) {
    // Create optimized assets for @kbn/ui-shared-deps
    await generateKbnUiSharedDepsOptimizedAssets(build);
  },
};
