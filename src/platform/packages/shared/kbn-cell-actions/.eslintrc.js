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
 * @property {string} name - The name of the module to restrict.
 * @property {string} [message] - Custom message appended to the lint error.
 * @property {string[]} [importNames] - Specific named imports to restrict.
 * @property {string[]} [allowImportNames] - Named imports to allow (restricts all others).
 */

/**
 * @typedef {Object} RestrictedImportPatternGroup
 * @property {string[]} group - Array of gitignore-style patterns to restrict.
 * @property {string} [message] - Custom message.
 * @property {string[]} [importNames] - Named imports to restrict within the group.
 * @property {string[]} [allowImportNames] - Named imports to allow within the group.
 * @property {boolean} [caseSensitive=false] - Whether the pattern is case-sensitive.
 */

/**
 * @typedef {Object} RestrictedImportPatternRegex
 * @property {string} regex - Regex pattern string to restrict.
 * @property {string} [message] - Custom message.
 * @property {string[]} [importNames] - Named imports to restrict within the regex.
 * @property {string[]} [allowImportNames] - Named imports to allow within the regex.
 * @property {boolean} [caseSensitive=false] - Whether the regex is case-sensitive.
 */

/**
 * @typedef {Object} RestrictedImportOptions
 * @property {Array.<string|RestrictedImportPath>} [paths]
 *   - List of module names (as strings) or objects with `name`, `message`, `importNames`, or `allowImportNames`.
 * @property {Array.<string|RestrictedImportPatternGroup|RestrictedImportPatternRegex>} [patterns]
 *   - List of patterns (as strings), or objects with `group` or `regex`, plus optional `message`, `importNames`, `allowImportNames`, and `caseSensitive`.
 */

/**
 * @typedef {(
 *   'error'|'warn'|'off'|number |  // Simple severity
 *   [  // Array format with mixed restrictions
 *     'error'|'warn'|'off'|number,
 *     ...(  // Restriction list can contain:
 *       | RestrictedImportString
 *       | RestrictedImportPath
 *       | RestrictedImportPatternGroup
 *       | RestrictedImportPatternRegex
 *       | RestrictedImportOptions
 *     )[]
 *   ]
 * )} NoRestrictedImportsRuleConfig
 *
 * Represents the complete ESLint rule configuration structure:
 * - First element: severity (required)
 * - Subsequent elements: restrictions in either:
 *   a) Legacy format (strings/objects)
 *   b) Modern format (configuration object with paths/patterns)
 */

// eslint-disable-next-line import/no-nodejs-modules
const path = require('path');
// eslint-disable-next-line import/no-nodejs-modules
const { execSync } = require('child_process');

const minimatch = require('minimatch');

/** @type {Array.<RestrictedImportPath>} */
const RESTRICTED_IMPORTS_PATHS = [
  {
    name: 'enzyme',
    message: 'Please use @testing-library/react instead',
  },
];

const ROOT_DIR = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf8',
  cwd: __dirname,
}).trim();

const ROOT_CLIMB_STRING = path.relative(__dirname, ROOT_DIR); // i.e. '../../..'

/** @type {import('eslint').Linter.Config} */
const rootConfig = require(`${ROOT_CLIMB_STRING}/.eslintrc`); // eslint-disable-line import/no-dynamic-require

const clonedRootConfig = JSON.parse(JSON.stringify(rootConfig));

const overridesWithNoRestrictedImportRule = clonedRootConfig.overrides.filter(
  (override) => override.rules && 'no-restricted-imports' in override.rules
);

for (const override of overridesWithNoRestrictedImportRule) {
  /** @type {NoRestrictedImportsRuleConfig} */
  const rule = override.rules['no-restricted-imports'];

  if (Array.isArray(rule) && rule.length >= 2) {
    const [severity, ...rawOptions] = rule;

    /** @type {RestrictedImportOptions} */
    const modernConfig = { paths: [], patterns: [] };

    // Normalize all inputs into modern config format
    for (const opt of rawOptions) {
      if (typeof opt === 'string' || 'name' in opt) {
        modernConfig.paths.push(opt);
      } else if ('paths' in opt || 'patterns' in opt) {
        modernConfig.paths.push(...(opt.paths || []));
        modernConfig.patterns.push(...(opt.patterns || []));
      }
    }

    // Dynamic duplicates removal for all restricted imports
    const existingPaths = modernConfig.paths.filter(
      (existing) =>
        !RESTRICTED_IMPORTS_PATHS.some((restriction) =>
          typeof existing === 'string'
            ? existing === restriction.name
            : existing.name === restriction.name
        )
    );

    /** @type {NoRestrictedImportsRuleConfig} */
    const newRuleConfig = [
      severity,
      {
        paths: [...existingPaths, ...RESTRICTED_IMPORTS_PATHS],
        patterns: modernConfig.patterns,
      },
    ];

    override.rules['no-restricted-imports'] = newRuleConfig;
  }
}

function getAssignableDifference(inputPath, targetDir) {
  // Normalize to absolute paths
  const absoluteTarget = path.resolve(targetDir);
  const isGlob = inputPath.includes('**');

  // Split into base path and remaining pattern
  let base;
  let remaining;
  if (isGlob) {
    const globIndex = inputPath.indexOf('**');
    base = inputPath.slice(0, globIndex).replace(/[\\/]+$/, '');
    remaining = inputPath.slice(globIndex);
  } else {
    base = inputPath;
    remaining = '';
  }

  const absoluteBase = path.resolve(base);

  // Check if target is within base path
  if (!absoluteTarget.startsWith(absoluteBase)) return null;

  if (isGlob) {
    return remaining || path.normalize('**/*');
  } else {
    const relative = path.relative(absoluteBase, absoluteTarget);
    return relative || '.';
  }
}

const absOverrides = overridesWithNoRestrictedImportRule.map((override) => ({
  ...override,
  files: override.files.map((fileOrGlob) => {
    return path.resolve(ROOT_DIR, fileOrGlob);
  }),
}));

const inScopeOverrides = absOverrides.map((override) => ({
  ...override,
  files: override.files
    .filter((absPath) => {
      return minimatch(__dirname, path.dirname(absPath), {
        matchBase: true,
        dot: true,
        nocase: true,
      });
    })
    .map((absPath) => {
      return getAssignableDifference(absPath, __dirname);
    })
    .filter(Boolean),
}));

const finalOverrides = inScopeOverrides.filter((override) => override.files.length > 0);

module.exports = {
  overrides: finalOverrides,
};
