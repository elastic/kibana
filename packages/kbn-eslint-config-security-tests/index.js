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
 * @typedef {Object} RestrictedImportOptions
 * @property {Array.<string|RestrictedImportPath>} [paths]
 * @property {Array.<string|Object>} [patterns]
 */

/**
 * @typedef {(
 *   'error'|'warn'|'off'|number |
 *   ['error'|'warn'|'off'|number, ...(RestrictedImportString|RestrictedImportPath|RestrictedImportOptions)[]]
 * )} NoRestrictedImportsRuleConfig
 */

// eslint-disable-next-line import/no-nodejs-modules
const path = require('path');

const { minimatch } = require('minimatch');

const ROOT_DIR = path.resolve(__dirname, '../..');

/** @type {Array.<RestrictedImportPath>} */
const HEAVY_SELECTOR_RESTRICTED_IMPORTS = [
  {
    name: '@testing-library/react',
    importNames: [
      'getByRole',
      'getAllByRole',
      'queryByRole',
      'queryAllByRole',
      'findByRole',
      'findAllByRole',
      'getByLabelText',
      'getAllByLabelText',
      'queryByLabelText',
      'queryAllByLabelText',
      'findByLabelText',
      'findAllByLabelText',
    ],
    message:
      'ByRole and ByLabelText selectors are considered slow. Use lighter alternatives like ByText, ByTestId etc. instead.',
  },
];

/**
 * Returns the glob pattern (or non-glob relative path) that the given absolute
 * `inputPath` represents relative to `targetDir`, or `null` when `inputPath`
 * is outside `targetDir`.
 *
 * @param {string} inputPath - Absolute path (possibly with `**` glob segment).
 * @param {string} targetDir - Absolute path to the consumer directory.
 * @returns {string|null}
 */
function getAssignableDifference(inputPath, targetDir) {
  const absoluteTarget = path.resolve(targetDir);
  const isGlob = inputPath.includes('**');

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

  if (!absoluteTarget.startsWith(absoluteBase)) return null;

  if (isGlob) {
    return remaining || path.normalize('**/*');
  } else {
    const relative = path.relative(absoluteBase, absoluteTarget);
    return relative || '.';
  }
}

/**
 * Creates an ESLint config that bans heavy accessibility selectors
 * (`ByRole`, `ByLabelText`) and enzyme, merging with the repo-root
 * `no-restricted-imports` overrides that already exist.
 *
 * Files whose names contain `legacy` are automatically exempted so that
 * snapshot-heavy legacy test files don't need to be updated.
 *
 * @param {string} consumerDir - `__dirname` of the consuming `.eslintrc.js`.
 * @returns {import('eslint').Linter.Config}
 */
module.exports = function createHeavySelectorBanConfig(consumerDir) {
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing, import/no-dynamic-require
  const rootConfig = require(path.resolve(ROOT_DIR, '.eslintrc'));
  const clonedRootConfig = structuredClone(rootConfig);

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

      for (const opt of rawOptions) {
        if (typeof opt === 'string' || 'name' in opt) {
          modernConfig.paths.push(opt);
        } else if ('paths' in opt || 'patterns' in opt) {
          modernConfig.paths.push(...(opt.paths || []));
          modernConfig.patterns.push(...(opt.patterns || []));
        }
      }

      const existingPaths = modernConfig.paths.filter(
        (existing) =>
          !HEAVY_SELECTOR_RESTRICTED_IMPORTS.some((restriction) =>
            typeof existing === 'string'
              ? existing === restriction.name
              : existing.name === restriction.name
          )
      );

      override.rules['no-restricted-imports'] = [
        severity,
        {
          paths: [...existingPaths, ...HEAVY_SELECTOR_RESTRICTED_IMPORTS],
          patterns: modernConfig.patterns,
        },
      ];
    }
  }

  const absOverrides = overridesWithNoRestrictedImportRule.map((override) => ({
    ...override,
    files: override.files.map((fileOrGlob) => path.resolve(ROOT_DIR, fileOrGlob)),
  }));

  const inScopeOverrides = absOverrides.map((override) => ({
    ...override,
    files: override.files
      .filter((absPath) =>
        minimatch(consumerDir, path.dirname(absPath), {
          matchBase: true,
          dot: true,
          nocase: true,
        })
      )
      .map((absPath) => getAssignableDifference(absPath, consumerDir))
      .filter(Boolean),
  }));

  const finalOverrides = inScopeOverrides.filter((override) => override.files.length > 0);

  return {
    overrides: [
      ...finalOverrides,
      // Files whose name contains "legacy" are exempt from the heavy-selector ban.
      {
        files: ['**/*legacy*'],
        rules: {
          'no-restricted-imports': 'off',
        },
      },
    ],
  };
};
