/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');

/**
 * @param {string} path
 * @returns {any}
 */
function loadJsonFile(path) {
  try {
    return JSON.parse(Fs.readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Missing file: ${path}`);
    }

    throw new Error(
      `Unable to read JSON at [${Path.relative(process.cwd(), path)}]: ${error.message}`
    );
  }
}

module.exports = {
  loadJsonFile,
};
