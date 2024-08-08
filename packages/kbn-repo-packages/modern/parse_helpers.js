/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @type {{ [k in import('./types').KibanaPackageType]: true }} */
const PACKAGE_TYPE_MAP = {
  'functional-tests': true,
  core: true,
  plugin: true,
  'shared-browser': true,
  'shared-common': true,
  'shared-scss': true,
  'shared-server': true,
  'test-helper': true,
};

const PACKAGE_TYPES = /** @type {Array<import('./types').KibanaPackageType>} */ (
  /** @type {unknown} */ (Object.keys(PACKAGE_TYPE_MAP))
);

const PLUGIN_ID_PATTERN = /^[a-z][a-zA-Z_]*$/;

/**
 * @param {unknown} v
 * @returns {v is string}
 */
function isSomeString(v) {
  return typeof v === 'string' && !!v;
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isObj(v) {
  return typeof v === 'object' && v !== null;
}

/**
 * @param {unknown} v
 * @returns {v is string}
 */
function isValidPluginId(v) {
  return typeof v === 'string' && PLUGIN_ID_PATTERN.test(v);
}

/**
 * @param {unknown} v
 * @returns {v is import('./types').KibanaPackageType}
 */
function isValidPkgType(v) {
  return typeof v === 'string' && Object.hasOwn(PACKAGE_TYPE_MAP, v);
}

/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
function isArrOfStrings(v) {
  return Array.isArray(v) && v.every(isSomeString);
}

/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
function isArrOfIds(v) {
  return Array.isArray(v) && v.every(isValidPluginId);
}

module.exports = {
  PACKAGE_TYPES,
  isSomeString,
  isObj,
  isValidPluginId,
  isValidPkgType,
  isArrOfIds,
  isArrOfStrings,
};
