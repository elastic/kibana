/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const { isObj } = require('./parse_helpers');

/**
 * Asserts that given value looks like a parsed package.json file
 * @param {unknown} v
 * @returns {asserts v is import('./types').ParsedPackageJson}
 */
function validateParsedPackageJson(v) {
  if (!isObj(v)) {
    throw new Error('Expected package.json to be a JSON object');
  }

  if (typeof v.name !== 'string') {
    throw new Error(`Expected package.json to have a "name", and for it to be a string`);
  }

  if (v.dependencies && !isObj(v.dependencies)) {
    throw new Error('Expected "dependencies" to be an object');
  }

  if (v.devDependencies && !isObj(v.devDependencies)) {
    throw new Error('Expected "dependencies" to be an object');
  }

  const kibana = v.kibana;
  if (kibana !== undefined) {
    if (!isObj(kibana)) {
      throw new Error('Expected "kibana" field in package.json to be an object');
    }

    if (kibana.devOnly !== undefined && typeof kibana.devOnly !== 'boolean') {
      throw new Error('Expected "kibana.devOnly" field in package.json to be a boolean');
    }
  }
}

/**
 * Reads a given package.json file from disk and parses it
 * @param {string} path
 * @returns {import('./types').ParsedPackageJson | undefined}
 */
function readPackageJson(path) {
  let pkg;
  try {
    pkg = JSON.parse(Fs.readFileSync(path, 'utf8'));
    validateParsedPackageJson(pkg);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`unable to parse package.json at [${path}]: ${error.message}`);
    }
  }
  return pkg;
}

module.exports = { readPackageJson, validateParsedPackageJson };
