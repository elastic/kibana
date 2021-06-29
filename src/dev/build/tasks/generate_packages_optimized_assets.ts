/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipeline } from 'stream';
import { promisify } from 'util';

import gulpBrotli from 'gulp-brotli';
// @ts-expect-error
import gulpGzip from 'gulp-gzip';
// @ts-expect-error
import gulpPostCSS from 'gulp-postcss';
// @ts-expect-error
import gulpTerser from 'gulp-terser';
import terser from 'terser';
import vfs from 'vinyl-fs';

import { ToolingLog } from '@kbn/dev-utils';
import { Task, Build } from '../lib';

const asyncPipeline = promisify(pipeline);

const minifyKbnUiSharedDepsCSS = async (log: ToolingLog, build: Build) => {
  const buildRoot = build.resolvePath();

  log.debug('Minify CSS');

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

    vfs.dest('node_modules/@kbn/ui-shared-deps/shared_built_assets', { cwd: buildRoot })
  );
};

const minifyKbnUiSharedDepsJS = async (log: ToolingLog, build: Build) => {
  const buildRoot = build.resolvePath();

  log.debug('Minify JS');

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

    vfs.dest('node_modules/@kbn/ui-shared-deps/shared_built_assets', { cwd: buildRoot })
  );
};

const brotliCompressKbnUiSharedDeps = async (log: ToolingLog, build: Build) => {
  const buildRoot = build.resolvePath();

  log.debug('Brotli compress');

  await asyncPipeline(
    vfs.src(['node_modules/@kbn/ui-shared-deps/shared_built_assets/**/*.{js,css}'], {
      cwd: buildRoot,
    }),

    gulpBrotli(),

    vfs.dest('node_modules/@kbn/ui-shared-deps/shared_built_assets', { cwd: buildRoot })
  );
};

const gzipCompressKbnUiSharedDeps = async (log: ToolingLog, build: Build) => {
  const buildRoot = build.resolvePath();

  log.debug('GZip compress');

  await asyncPipeline(
    vfs.src(['node_modules/@kbn/ui-shared-deps/shared_built_assets/**/*.{js,css}'], {
      cwd: buildRoot,
    }),

    gulpGzip(),

    vfs.dest('node_modules/@kbn/ui-shared-deps/shared_built_assets', { cwd: buildRoot })
  );
};

const generateKbnUiSharedDepsOptimizedAssets = async (log: ToolingLog, build: Build) => {
  log.info('Creating optimized assets for @kbn/ui-shared-deps');
  await minifyKbnUiSharedDepsCSS(log, build);
  await minifyKbnUiSharedDepsJS(log, build);
  await brotliCompressKbnUiSharedDeps(log, build);
  await gzipCompressKbnUiSharedDeps(log, build);
};

export const GeneratePackagesOptimizedAssets: Task = {
  description: 'Generates Optimized Assets for Packages',

  async run(config, log, build) {
    // Create optimized assets for @kbn/ui-shared-deps
    await generateKbnUiSharedDepsOptimizedAssets(log, build);
  },
};
