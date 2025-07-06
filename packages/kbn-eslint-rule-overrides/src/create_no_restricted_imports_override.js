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
 * @typedef {Object} RestrictedImportPatternGroup
 * Configuration for restricting imports using gitignore-style patterns.
 * @property {string[]} group - Array of gitignore-style patterns to restrict.
 * @property {string} [message] - Custom message.
 * @property {string[]} [importNames] - Named imports to restrict within the group.
 * @property {string[]} [allowImportNames] - Named imports to allow within the group.
 * @property {boolean} [caseSensitive] - Whether the pattern is case-sensitive.
 */

/**
 * @typedef {Object} RestrictedImportPatternRegex
 * Configuration for restricting imports using regex patterns.
 * @property {string} regex - Regex pattern string to restrict.
 * @property {string} [message] - Custom message.
 * @property {string[]} [importNames] - Named imports to restrict within the regex.
 * @property {string[]} [allowImportNames] - Named imports to allow within the regex.
 * @property {boolean} [caseSensitive] - Whether the regex is case-sensitive.
 */

/**
 * @typedef {Object} RestrictedImportOptions
 * Options for the no-restricted-imports rule.
 * @property {Array<RestrictedImportString | RestrictedImportPath>} [paths] - List of module names or path configurations to restrict.
 * @property {Array<string | RestrictedImportPatternGroup | RestrictedImportPatternRegex>} [patterns] - List of patterns to restrict.
 */

/**
 * @typedef {'error' | 'warn' | 'off' | 0 | 1 | 2} RuleSeverity
 * ESLint rule severity levels.
 */

/**
 * @typedef {Object} CreateOverrideOptions
 * Options for creating override configurations.
 * @property {string} childConfigDir - Directory path for nested eslint configuration
 * @property {Array<RestrictedImportString | RestrictedImportPath>} restrictedImports - Additional restricted imports to add.
 */

const path = require('path');

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
const rootConfig = require('../../../.eslintrc');

const minimatch = require('minimatch');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

/**
 * Creates an ESLint configuration override for no-restricted-imports rule
 * that merges with existing root configuration and applies to the current directory context.
 * @param {CreateOverrideOptions} options = {} - Configuration options
 * @returns {Array<Object>} Array of ESLint override configurations
 */
function createNoRestrictedImportsOverride(options = {}) {
  const { restrictedImports = [], childConfigDir } = options;

  if (!childConfigDir) {
    throw new Error(
      'No childConfigDir provided. Please pass __dirname in your nested .eslintrc.js file.'
    );
  }

  if (restrictedImports.length === 0) {
    throw new Error(
      'No restricted imports provided. Please specify at least one import to restrict.'
    );
  }

  // Find overrides with no-restricted-imports rule
  const overridesWithNoRestrictedImportRule = (rootConfig.overrides || []).filter((override) =>
    Boolean(override.rules && 'no-restricted-imports' in override.rules)
  );

  // Process each override
  for (const override of overridesWithNoRestrictedImportRule) {
    const noRestrictedImportsRule = override.rules['no-restricted-imports'];

    // if the rule has options, i.e. ['error', { paths: [...], patterns: [...] }]
    // as opposed to just 'error'
    if (Array.isArray(noRestrictedImportsRule) && noRestrictedImportsRule.length >= 2) {
      const [severity, ...rawOptions] = noRestrictedImportsRule;

      const modernConfig = { paths: [], patterns: [] };

      // Normalize all inputs into modern config format
      for (const opt of rawOptions) {
        if (typeof opt === 'string' || (typeof opt === 'object' && 'name' in opt)) {
          modernConfig.paths.push(opt);
        } else if (typeof opt === 'object' && ('paths' in opt || 'patterns' in opt)) {
          const optConfig = opt;
          if (optConfig.paths) modernConfig.paths.push(...optConfig.paths);
          if (optConfig.patterns) modernConfig.patterns.push(...optConfig.patterns);
        }
      }

      // Remove duplicates and add new restricted imports
      const existingPaths = modernConfig.paths.filter(
        (existing) =>
          !restrictedImports.some((restriction) => {
            if (typeof existing === 'string') {
              return typeof restriction === 'string'
                ? existing === restriction
                : existing === restriction.name;
            } else {
              return typeof restriction === 'string'
                ? existing.name === restriction
                : existing.name === restriction.name;
            }
          })
      );

      const newRuleConfig = [
        severity,
        {
          paths: [...existingPaths, ...restrictedImports],
          patterns: modernConfig.patterns,
        },
      ];

      override.rules['no-restricted-imports'] = newRuleConfig;
    }
  }

  /**
   * Calculate the relative path difference for file pattern assignment.
   * @param {string} inputPath - The input file path or glob pattern
   * @param {string} targetDir - The target directory to resolve against
   * @returns {string|null} The assignable difference or null if not applicable
   */
  function getAssignableDifference(inputPath, targetDir) {
    const absoluteTarget = path.resolve(targetDir);
    const isGlob = inputPath.includes('**');
    const hasSingleStar = inputPath.includes('*');

    let base;
    let remaining;

    if (isGlob) {
      const globIndex = inputPath.indexOf('**');
      base = inputPath.slice(0, globIndex).replace(/[\\/]+$/, '');
      remaining = inputPath.slice(globIndex);
    } else if (hasSingleStar) {
      // Handle single star globs like '*.js'
      const lastSlash = inputPath.lastIndexOf('/');
      base = inputPath.slice(0, lastSlash);
      remaining = inputPath.slice(lastSlash + 1);
    } else {
      base = inputPath;
      remaining = '';
    }

    const absoluteBase = path.resolve(base);

    if (!absoluteTarget.startsWith(absoluteBase)) return null;

    if (isGlob) {
      return remaining || path.normalize('**/*');
    } else if (hasSingleStar) {
      return remaining;
    } else {
      const relative = path.relative(absoluteBase, absoluteTarget);
      return relative || '.';
    }
  }

  // Convert file paths to absolute paths
  const absOverrides = overridesWithNoRestrictedImportRule.map((override) => {
    const overrideFiles = typeof override.files === 'string' ? [override.files] : override.files;

    return {
      ...override,
      files: overrideFiles.map((fileOrGlob) => {
        return path.resolve(ROOT_DIR, fileOrGlob);
      }),
    };
  });

  // Filter overrides that apply to current directory
  const inScopeOverrides = absOverrides.map((override) => {
    return {
      ...override,
      files: override.files
        .filter((absPath) => {
          return minimatch(childConfigDir, path.dirname(absPath), {
            matchBase: true,
            dot: true,
            nocase: true,
          });
        })
        .map((absPath) => {
          return getAssignableDifference(absPath, childConfigDir);
        })
        .filter((file) => Boolean(file)),
    };
  });

  return inScopeOverrides.filter((override) => override.files.length > 0);
}

module.exports = {
  createNoRestrictedImportsOverride,
};
