/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import fs from 'fs';
import zlib from 'zlib';
import { cpus } from 'os';

import { minifySync } from '@swc/core';
import { transform as lightningTransform } from 'lightningcss';
import { asyncForEachWithLimit } from '@kbn/std';
import type { ToolingLog } from '@kbn/tooling-log';
import globby from 'globby';
import del from 'del';

import type { Task } from '../lib';
import { write } from '../lib';

const EUI_THEME_RE = /\.v\d\.(light|dark)\.css$/;
const ASYNC_CHUNK_RE = /\.chunk\.\d+\.js$/;

const getSize = (paths: string[]) => paths.reduce((acc, path) => acc + fs.statSync(path).size, 0);

const BROTLI_QUALITY = 9;
const PARALLEL_CONCURRENCY = cpus().length;

async function optimizeAssets(log: ToolingLog, assetDir: string) {
  log.info('Creating optimized assets for', assetDir);
  log.indent(4);
  try {
    log.debug('Remove Pre Minify Sourcemaps');
    await del(['**/*.map'], { cwd: assetDir });

    log.debug('Minify CSS with Lightning CSS');
    const cssFiles = await globby(['**/*.css'], { cwd: assetDir, absolute: true });
    await asyncForEachWithLimit(cssFiles, PARALLEL_CONCURRENCY, async (file) => {
      const code = await Fsp.readFile(file);
      const result = lightningTransform({
        filename: Path.basename(file),
        code,
        minify: true,
      });
      await Fsp.writeFile(file, result.code);
    });

    log.debug('Minify JS with SWC');
    const jsFiles = await globby(['**/*.js'], { cwd: assetDir, absolute: true });
    await asyncForEachWithLimit(jsFiles, PARALLEL_CONCURRENCY, async (file) => {
      const source = await Fsp.readFile(file, 'utf8');
      const result = minifySync(source, {
        compress: { passes: 2 },
        mangle: true,
        sourceMap: false,
      });
      await Fsp.writeFile(file, result.code);
    });

    log.debug('Brotli compress');
    const compressFiles = await globby(['**/*.{js,css}'], { cwd: assetDir, absolute: true });
    await asyncForEachWithLimit(compressFiles, PARALLEL_CONCURRENCY, async (file) => {
      const content = await Fsp.readFile(file);
      const compressed = zlib.brotliCompressSync(content, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
        },
      });
      await Fsp.writeFile(file + '.br', compressed);
    });
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
      // only track borealis.light theme
      if (path.includes('borealis.light')) {
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
