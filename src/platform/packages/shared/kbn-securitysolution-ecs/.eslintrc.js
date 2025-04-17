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

/** @type {import('eslint').Linter.Config} */
const rootConfig = require('../../../../../.eslintrc'); // eslint-disable-line @kbn/imports/no_boundary_crossing

/** @type {Array.<RestrictedImportPath>} */
const RESTRICTED_IMPORTS = [
  {
    name: 'enzyme',
    message: 'Please use @testing-library/react instead',
  },
];

const clonedRootConfig = structuredClone(rootConfig);

const overridesWithNoRestrictedImportRule = clonedRootConfig.overrides.filter(
  (override) => override.rules && 'no-restricted-imports' in override.rules
);

overridesWithNoRestrictedImportRule.forEach((override) => {
  /** @type {NoRestrictedImportsRuleConfig} */
  const rule = override.rules['no-restricted-imports'];

  if (Array.isArray(rule) && rule.length >= 2) {
    const [severity, ...rawOptions] = rule;

    /** @type {RestrictedImportOptions} */
    const modernConfig = { paths: [], patterns: [] };

    // Normalize all inputs into modern config format
    rawOptions.forEach((opt) => {
      if (typeof opt === 'string' || 'name' in opt) {
        modernConfig.paths.push(opt);
      } else if ('paths' in opt || 'patterns' in opt) {
        modernConfig.paths.push(...(opt.paths || []));
        modernConfig.patterns.push(...(opt.patterns || []));
      }
    });

    // Dynamic duplicate removal for all restricted imports
    const existingPaths = modernConfig.paths.filter(
      (existing) =>
        !RESTRICTED_IMPORTS.some((restriction) =>
          typeof existing === 'string'
            ? existing === restriction.name
            : existing.name === restriction.name
        )
    );

    /** @type {NoRestrictedImportsRuleConfig} */
    const newRuleConfig = [
      severity,
      {
        paths: [...existingPaths, ...RESTRICTED_IMPORTS],
        patterns: modernConfig.patterns,
      },
    ];

    override.rules['no-restricted-imports'] = newRuleConfig;
  }
});

module.exports = {
  overrides: overridesWithNoRestrictedImportRule,
};
