/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @typedef {string} RestrictedImportString
 * A string specifying a module name to restrict.
 */

/**
 * @typedef {Object} RestrictedImportPath
 * Configuration for restricting a specific import path.
 * @property {string} name - The name of the module to restrict.
 * @property {string} [message] - Custom message appended to the lint error.
 * @property {string[]} [importNames] - Specific named imports to restrict.
 * @property {string[]} [allowImportNames] - Named imports to allow (restricts all others).
 */

/**
 * @typedef {Object} CreateOverrideOptions
 * Options for creating override configurations.
 * @property {string} childConfigDir - Directory path for nested eslint configuration
 * @property {Array<RestrictedImportString | RestrictedImportPath>} restrictedImports - Additional restricted imports to add.
 */

const path = require('path');
const {
  transformOverridesForNestedContext,
} = require('../utils/transform_overrides_for_nested_context');
const { mergeRestrictedImports } = require('./utils/merge_restricted_imports');

// eslint-disable-next-line import/no-dynamic-require, @kbn/imports/no_boundary_crossing
const rootConfig = require('../../../../.eslintrc');

const rootDir = path.resolve(__dirname, '..', '..', '..', '..');

/**
 * Creates root eslint configuration deepclone
 * and merges additional restricted imports into
 * it's overrides while also localizing files and excludedFiles
 * glob patterns to the nested context.
 *
 * Returns an array of overrides that contain
 * the 'no-restricted-imports' rule with the merged
 * restricted imports.
 *
 * @param {CreateOverrideOptions} options - Configuration options
 * @returns {Array<Object>} Array of updated root eslint config overrides
 */
function createNoRestrictedImportsOverride(options = {}) {
  const { restrictedImports = [], childConfigDir } = options;

  // Validate inputs
  if (!childConfigDir) {
    throw new Error(
      'No childConfigDir provided. Please pass __dirname in your nested .eslintrc.js file.'
    );
  }

  if (!restrictedImports || restrictedImports.length === 0) {
    throw new Error(
      'No restricted imports provided. Please specify at least one import to restrict.'
    );
  }

  // Deep clone the root config to avoid mutating it
  // from nested context
  const clonedRootConfig = JSON.parse(JSON.stringify(rootConfig));

  if (!clonedRootConfig.overrides || clonedRootConfig.overrides.length === 0) {
    return [];
  }

  // find overrides with no-restricted-imports rules in root config
  // and merge our restricted imports into them
  mergeRestrictedImports(clonedRootConfig, restrictedImports);

  // rule merging is done, now we need to transform
  // all clonedRootConfig.overrides[].files and clonedRootConfig.overrides[].excludedFiles
  // to match the nested context so that all overrides
  // can be equally applied correctly on the nested context level
  return transformOverridesForNestedContext(
    clonedRootConfig.overrides,
    rootDir,
    childConfigDir,
    (override) => Boolean(override.rules && 'no-restricted-imports' in override.rules)
  );
}

module.exports = {
  createNoRestrictedImportsOverride,
};
