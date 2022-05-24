/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { pipeline } from 'stream';
import { promisify } from 'util';
import fs from 'fs';

import gulpBrotli from 'gulp-brotli';
// @ts-expect-error
import gulpGzip from 'gulp-gzip';
// @ts-expect-error
import gulpPostCSS from 'gulp-postcss';
// @ts-expect-error
import gulpTerser from 'gulp-terser';
import { ToolingLog } from '@kbn/tooling-log';
import terser from 'terser';
import vfs from 'vinyl-fs';
import globby from 'globby';
import del from 'del';
import zlib from 'zlib';

import { Task, write } from '../lib';

const EUI_THEME_RE = /\.v\d\.(light|dark)\.css$/;
const ASYNC_CHUNK_RE = /\.chunk\.\d+\.js$/;
const asyncPipeline = promisify(pipeline);

const getSize = (paths: string[]) => paths.reduce((acc, path) => acc + fs.statSync(path).size, 0);

async function optimizeAssets(log: ToolingLog, assetDir: string) {
  log.info('Creating optimized assets for', assetDir);
  log.indent(4);
  try {
    log.debug('Remove Pre Minify Sourcemaps');
    await del(['**/*.map'], { cwd: assetDir });

    log.debug('Minify CSS');
    await asyncPipeline(
      vfs.src(['**/*.css'], { cwd: assetDir }),
      gulpPostCSS([
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('cssnano')({
          preset: ['default', { discardComments: false }],
        }),
      ]),
      vfs.dest(assetDir)
    );

    log.debug('Minify JS');
    await asyncPipeline(
      vfs.src(['**/*.js'], { cwd: assetDir }),
      gulpTerser({ compress: { passes: 2 }, mangle: true }, terser.minify),
      vfs.dest(assetDir)
    );

    log.debug('Brotli compress');
    await asyncPipeline(
      vfs.src(['**/*.{js,css}'], { cwd: assetDir }),
      gulpBrotli({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        },
      }),
      vfs.dest(assetDir)
    );

    log.debug('GZip compress');
    await asyncPipeline(
      vfs.src(['**/*.{js,css}'], { cwd: assetDir }),
      gulpGzip({
        gzipOptions: {
          level: 9,
        },
      }),
      vfs.dest(assetDir)
    );
  } finally {
    log.indent(-4);
  }
}

type Category = ReturnType<typeof getCategory>;
const getCategory = (relative: string) => {
  if (EUI_THEME_RE.test(relative)) {
    return 'euiTheme';
  }

  if (relative.endsWith('.css')) {
    return 'css';
  }

  if (relative.endsWith('.ttf')) {
    return 'font';
  }

  if (ASYNC_CHUNK_RE.test(relative)) {
    return 'asyncChunk';
  }

  if (relative.includes('kbn-ui-shared-deps-npm')) {
    return 'npm';
  }

  if (relative.includes('kbn-ui-shared-deps-src')) {
    return 'src';
  }

  throw new Error(`unable to categorize file [${relative}]`);
};

function categorizeAssets(assetDirs: string[]) {
  const assets = assetDirs.flatMap((assetDir) =>
    globby
      .sync(['**/*'], {
        cwd: assetDir,
        ignore: ['*-manifest.json', '*.gz', '*.br'],
        absolute: true,
      })
      .map((path): { path: string; category: Category } => ({
        path,
        category: getCategory(Path.relative(assetDir, path)),
      }))
  );

  const groups = new Map<Category, string[]>();
  const add = (cat: Category, path: string) => {
    const group = groups.get(cat) ?? [];
    group.push(path);
    groups.set(cat, group);
  };

  for (const { path, category } of assets) {
    if (category === 'euiTheme') {
      // only track v8.light theme
      if (path.includes('v8.light')) {
        add('css', path);
      }
      continue;
    }

    add(category, path);
  }

  return groups;
}

export const GeneratePackagesOptimizedAssets: Task = {
  description: 'Generates Optimized Assets for Packages',

  async run(config, log, build) {
    const npmAssetDir = build.resolvePath(
      `node_modules/@kbn/ui-shared-deps-npm/shared_built_assets`
    );
    const srcAssetDir = build.resolvePath(
      `node_modules/@kbn/ui-shared-deps-src/shared_built_assets`
    );
    const assetDirs = [npmAssetDir, srcAssetDir];

    // process assets in each ui-shared-deps package
    for (const assetDir of assetDirs) {
      await optimizeAssets(log, assetDir);
    }

    // analyze assets to produce metrics.json file
    const groups = categorizeAssets(assetDirs);
    log.verbose('categorized assets', groups);
    const metrics = [
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-npmDll',
        value: getSize(groups.get('npm') ?? []),
      },
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-srcJs',
        value: getSize(groups.get('src') ?? []),
      },
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-css',
        value: getSize(groups.get('css') ?? []),
      },
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-fonts',
        value: getSize(groups.get('font') ?? []),
      },
    ];
    log.verbose('metrics:', metrics);

    // write unified metrics to the @kbn/ui-shared-deps-src asset dir
    log.debug('Create metrics.json');
    await write(Path.resolve(srcAssetDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  },
};
