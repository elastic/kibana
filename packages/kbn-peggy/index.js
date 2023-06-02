/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');
const Fs = require('fs');
const Fsp = require('fs/promises');

const Peggy = require('peggy');

/**
 * @param {string} grammarPath
 * @returns {import('./types').Config | undefined}
 */
function findConfigFile(grammarPath) {
  const path = Path.resolve(Path.dirname(grammarPath), `${Path.basename(grammarPath)}.config.json`);

  let source;
  let parsed;
  try {
    source = Fs.readFileSync(path, 'utf8');
    parsed = JSON.parse(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }

  return { path, source, parsed };
}

/**
 *
 * @param {import('./types').Options} options
 * @returns {Promise<import('./types').Result>}
 */
async function getJsSource(options) {
  let source;
  if (options.content) {
    source = options.content;
  } else if (options.path) {
    source = await Fsp.readFile(options.path, 'utf8');
  } else {
    throw new Error('you must either specify the path of the grammar file, or the content');
  }

  return getJsSourceSync({
    content: source,
    ...options,
  });
}

/**
 * @param {import('./types').SyncOptions} options
 * @returns
 */
function getJsSourceSync(options) {
  const config =
    options.config ??
    (options.path && options.skipConfigSearch !== true ? findConfigFile(options.path) : null);

  const result = Peggy.generate(options.content, {
    ...config?.parsed,
    format: options.format === 'esm' ? 'es' : 'commonjs',
    optimize: options.optimize,
    output: 'source',
  });

  return {
    /**
     * The source code of the module which parses expressions in the format
     * defined by the peggy grammar file
     */
    source: /** @type {string} */ (/** @type {unknown} */ (result)),

    /**
     * The loaded config if it was found
     */
    config: config ?? null,
  };
}

module.exports = {
  findConfigFile,
  getJsSource,
  getJsSourceSync,
  version: Peggy.VERSION,
};
