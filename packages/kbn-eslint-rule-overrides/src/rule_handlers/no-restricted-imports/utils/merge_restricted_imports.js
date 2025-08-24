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
 * A string specifying a module name to restrict. Example: 'lodash' or 'react-router'.
 */

/**
 * @typedef {Object} RestrictedImportPath
 * @property {string} name - The name of the module to restrict. Example: 'lodash', 'react-router'.
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
 *   'error'|'warn'|'off'|number |
 *   [
 *     'error'|'warn'|'off'|number,
 *     ...(
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

/**
 * Merge/Mutate restricted imports into existing ESLint config overrides
 * @param {import('eslint').Linter.Config} config - ESLint config object to modify
 * @param {Array} restrictedImports - Additional restricted imports to add
 * @param {number|null} severity - Optional severity override (0=off, 1=warn, 2=error)
 */
function mergeRestrictedImports(config, restrictedImports, severity = null) {
  if (!config || !config.overrides || config.overrides.length === 0) {
    return;
  }

  if (!restrictedImports || (Array.isArray(restrictedImports) && restrictedImports.length === 0)) {
    return;
  }

  const normalizedImports = Array.isArray(restrictedImports)
    ? restrictedImports
    : [restrictedImports];

  const overridesWithNoRestrictedImportRule = config.overrides.filter((override) =>
    Boolean(override.rules && 'no-restricted-imports' in override.rules)
  );

  // Process and merge restricted imports into existing rules
  for (const override of overridesWithNoRestrictedImportRule) {
    const noRestrictedImportsRule = override.rules['no-restricted-imports'];

    if (Array.isArray(noRestrictedImportsRule) && noRestrictedImportsRule.length >= 2) {
      const [currentSeverity, ...rawOptions] = noRestrictedImportsRule;
      const finalSeverity = severity !== null ? severity : currentSeverity;

      const modernConfig = { paths: [], patterns: [] };

      // Normalize all inputs into modern config format
      for (const opt of rawOptions) {
        if (typeof opt === 'string' || (typeof opt === 'object' && opt && 'name' in opt)) {
          modernConfig.paths.push(opt);
        } else if (typeof opt === 'object' && opt && ('paths' in opt || 'patterns' in opt)) {
          const optConfig = opt;
          if (optConfig.paths) modernConfig.paths.push(...optConfig.paths);
          if (optConfig.patterns) modernConfig.patterns.push(...optConfig.patterns);
        }
      }

      // Remove duplicates and add new restricted imports
      const existingPaths = modernConfig.paths.filter(
        (existing) =>
          !normalizedImports.some((restriction) => {
            if (typeof existing === 'string') {
              return typeof restriction === 'string'
                ? existing === restriction
                : existing === restriction.name;
            } else if (existing && typeof existing === 'object' && 'name' in existing) {
              return typeof restriction === 'string'
                ? existing.name === restriction
                : existing.name === restriction.name;
            }
            return false;
          })
      );

      const newRuleConfig = [
        finalSeverity,
        {
          paths: [...existingPaths, ...normalizedImports],
          patterns: modernConfig.patterns,
        },
      ];

      override.rules['no-restricted-imports'] = newRuleConfig;
    }
  }
}

module.exports = {
  mergeRestrictedImports,
};
