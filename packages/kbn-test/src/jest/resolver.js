/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Inspired in a discussion found at https://github.com/facebook/jest/issues/5356 as Jest currently doesn't
// offer any other option to preserve symlinks.
//
// It would be available once https://github.com/facebook/jest/pull/9976 got merged.

const Path = require('path');
const resolve = require('resolve');
const { REPO_ROOT } = require('@kbn/repo-info');
const { readPackageMap } = require('@kbn/repo-packages');

const pkgMap = readPackageMap();

const APM_AGENT_MOCK = Path.resolve(__dirname, 'mocks/apm_agent_mock.ts');
const CSS_MODULE_MOCK = Path.resolve(__dirname, 'mocks/css_module_mock.js');
const STYLE_MOCK = Path.resolve(__dirname, 'mocks/style_mock.js');
const FILE_MOCK = Path.resolve(__dirname, 'mocks/file_mock.js');
const WORKER_MOCK = Path.resolve(__dirname, 'mocks/worker_module_mock.js');

const STATIC_FILE_EXT =
  `jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga`
    .split('|')
    .map((e) => `.${e}`);

/**
 * @param {string} request
 * @param {import('resolve').SyncOpts} options
 * @returns
 */
module.exports = (request, options) => {
  if (request === `@elastic/eui`) {
    return module.exports(`@elastic/eui/test-env`, options);
  }

  if (request.startsWith('@elastic/eui/lib/')) {
    return module.exports(request.replace('@elastic/eui/lib/', '@elastic/eui/test-env/'), options);
  }

  if (request === 'axios') {
    return resolve.sync('axios/dist/node/axios.cjs', {
      basedir: options.basedir,
      extensions: options.extensions,
    });
  }

  if (request === `elastic-apm-node`) {
    return APM_AGENT_MOCK;
  }

  const reqExt = Path.extname(request);
  if (reqExt) {
    const reqBasename = Path.basename(request, reqExt);
    if ((reqExt === '.css' || reqExt === '.scss') && reqBasename.endsWith('.module')) {
      return CSS_MODULE_MOCK;
    }

    if (reqExt === '.css' || reqExt === '.less' || reqExt === '.scss') {
      return STYLE_MOCK;
    }

    if (STATIC_FILE_EXT.includes(reqExt)) {
      return FILE_MOCK;
    }

    if (reqExt === '.worker' && (reqBasename.endsWith('.ace') || reqBasename.endsWith('.editor'))) {
      return WORKER_MOCK;
    }
  }

  if (request.startsWith('file-loader!') || request.startsWith('!!file-loader!')) {
    return FILE_MOCK;
  }

  if (request.startsWith('@kbn/')) {
    const [, id, ...sub] = request.split('/');
    const pkgDir = pkgMap.get(`@kbn/${id}`);
    if (!pkgDir) {
      throw new Error(
        `unable to resolve pkg import, pkg '@kbn/${id}' is not in the pkg map. Do you need to bootstrap?`
      );
    }

    return resolve.sync(`./${pkgDir}${sub.length ? `/${sub.join('/')}` : ''}`, {
      basedir: REPO_ROOT,
      extensions: options.extensions,
    });
  }

  try {
    return resolve.sync(request, {
      basedir: options.basedir,
      extensions: options.extensions,
    });
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return options.defaultResolver(request, options);
    }

    throw error;
  }
};
