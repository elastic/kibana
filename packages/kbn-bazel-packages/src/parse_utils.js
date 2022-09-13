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
  'plugin-browser': true,
  'plugin-server': true,
  'shared-browser': true,
  'shared-common': true,
  'shared-scss': true,
  'shared-server': true,
  'test-helper': true,
};

const PACKAGE_TYPES = /** @type {Array<import('./types').KibanaPackageType>} */ (
  /** @type {unknown} */ (Object.keys(PACKAGE_TYPE_MAP))
);

const ID_PATTERN = /^[a-z][a-zA-Z_]*$/;

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isObj(v) {
  return typeof v === 'object' && v !== null;
}

/** @param {unknown} v */
function isValidId(v) {
  return typeof v === 'string' && ID_PATTERN.test(v);
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
  return Array.isArray(v) && v.every((i) => typeof i === 'string');
}

/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
function isArrOfIds(v) {
  return Array.isArray(v) && v.every(isValidId);
}

module.exports = {
  PACKAGE_TYPES,
  isObj,
  isValidId,
  isValidPkgType,
  isArrOfIds,
  isArrOfStrings,
};
