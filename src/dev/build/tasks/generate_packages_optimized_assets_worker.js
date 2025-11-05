/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { pipeline } = require('stream');
const { promisify, format } = require('util');

const del = require('del');
const gulpBrotli = require('gulp-brotli');
const gulpPostCSS = require('gulp-postcss');
const gulpTerser = require('gulp-terser');
const terser = require('terser');
const vfs = require('vinyl-fs');
const zlib = require('zlib');

const ASSET_DIR_FLAG = '--asset-dir';
const WORKER_LOG_LEVEL_ENV = 'OPTIMIZE_ASSETS_LOG_LEVEL';
const asyncPipeline = promisify(pipeline);

const LOG_LEVEL_ORDER = {
  verbose: 0,
  debug: 1,
  info: 2,
  success: 2,
  warning: 3,
  error: 4,
};

const getLevelOrder = (level) => LOG_LEVEL_ORDER[level] ?? LOG_LEVEL_ORDER.info;

const createLogger = (minimumLevel) => {
  const threshold = getLevelOrder(minimumLevel);

  return (level, ...args) => {
    if (getLevelOrder(level) < threshold) {
      return;
    }

    if (typeof process.send === 'function') {
      process.send({ type: 'log', level, args });
      return;
    }

    const message = format(...args);
    process.stderr.write(`[optimize-assets:${level}] ${message}\n`);
  };
};

const getAssetDir = () => {
  const flagIndex = process.argv.indexOf(ASSET_DIR_FLAG);
  if (flagIndex === -1) {
    return undefined;
  }

  const value = process.argv[flagIndex + 1];
  return value && !value.startsWith('--') ? value : undefined;
};

const optimizeAssets = async (log, assetDir) => {
  log('debug', 'Remove Pre Minify Sourcemaps');
  await del(['**/*.map'], { cwd: assetDir });

  log('debug', 'Minify CSS');
  log('debug', 'Minify JS');
  await Promise.all([
    asyncPipeline(
      vfs.src(['**/*.css'], { cwd: assetDir }),
      gulpPostCSS(require('@kbn/optimizer/postcss.config').plugins),
      vfs.dest(assetDir)
    ),
    asyncPipeline(
      vfs.src(['**/*.js'], { cwd: assetDir }),
      gulpTerser({ compress: { passes: 2 }, mangle: true }, terser.minify),
      vfs.dest(assetDir)
    ),
  ]);

  log('debug', 'Brotli compress');
  await asyncPipeline(
    vfs.src(['**/*.{js,css}'], { cwd: assetDir }),
    gulpBrotli({
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      },
    }),
    vfs.dest(assetDir)
  );
};

(async () => {
  const assetDir = getAssetDir();
  if (!assetDir) {
    if (typeof process.send === 'function') {
      process.send({
        type: 'log',
        level: 'error',
        args: [`Missing ${ASSET_DIR_FLAG} argument for optimize-assets worker`],
      });
    } else {
      process.stderr.write(`Missing ${ASSET_DIR_FLAG} argument for optimize-assets worker\n`);
    }
    process.exit(1);
  }

  const logLevel = process.env[WORKER_LOG_LEVEL_ENV] || 'info';
  const log = createLogger(logLevel);

  try {
    await optimizeAssets(log, assetDir);
    log('debug', 'Finished optimizing assets for %s', assetDir);
  } catch (error) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    log('error', safeError.stack || safeError.message || String(safeError));
    process.exit(1);
  }

  process.exit(0);
})();
