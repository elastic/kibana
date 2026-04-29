/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fsp = require('fs/promises');

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
    throw new Error('you must either specify the path of the .text file, or the content');
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
  if (typeof options.content !== 'string') {
    throw new Error('options.content must be a string');
  }

  // Escape the text content as a valid JavaScript string literal and expose it via `module.exports`.
  const jsSource = `module.exports = ${JSON.stringify(options.content)};\n`;

  return {
    source: /** @type {string} */ (/** @type {unknown} */ jsSource),
  };
}

module.exports = {
  getJsSource,
  getJsSourceSync,
};
