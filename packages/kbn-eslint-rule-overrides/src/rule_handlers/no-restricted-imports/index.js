/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { mergeRestrictedImports } = require('./utils/merge_restricted_imports');

/**
 * Normalize severity to ESLint format
 */
function normalizeSeverity(severity) {
  if (severity === undefined || severity === null) return null;

  const severityMap = {
    off: 0,
    warn: 1,
    error: 2,
    0: 0,
    1: 1,
    2: 2,
  };

  return severityMap[severity] !== undefined ? severityMap[severity] : null;
}

/**
 * Handler for no-restricted-imports rule
 */
const noRestrictedImportsHandler = {
  ruleName: 'no-restricted-imports',

  /**
   * Process no-restricted-imports rule overrides
   * @param {Object} config - Cloned ESLint config to modify
   * @param {Object} ruleConfig - Rule configuration from user
   */
  process(config, ruleConfig) {
    const { strategy, value, severity } = ruleConfig;

    if (!config.overrides || config.overrides.length === 0) {
      return;
    }

    const normalizedSeverity = normalizeSeverity(severity);

    switch (strategy) {
      case 'merge':
        mergeRestrictedImports(config, value, normalizedSeverity);
        break;

      case 'append':
        // Same as merge for restricted imports
        mergeRestrictedImports(config, value, normalizedSeverity);
        break;

      case 'prepend':
        prependRestrictedImports(config, value, normalizedSeverity);
        break;

      case 'replace':
        replaceRestrictedImports(config, value, normalizedSeverity);
        break;

      case 'remove':
        if (value === undefined || value === null) {
          // Remove entire rule
          removeEntireRule(config);
        } else {
          // Remove specific imports
          removeSpecificImports(config, value, normalizedSeverity);
        }
        break;

      default:
        throw new Error(`Unknown strategy '${strategy}' for no-restricted-imports`);
    }
  },
};

/**
 * Prepend restricted imports (add at beginning of paths array)
 */
function prependRestrictedImports(config, restrictedImports, severity) {
  if (!restrictedImports) return;

  const overridesWithRule = config.overrides.filter(
    (override) => override.rules && 'no-restricted-imports' in override.rules
  );

  for (const override of overridesWithRule) {
    const rule = override.rules['no-restricted-imports'];

    if (Array.isArray(rule) && rule.length >= 2) {
      const [currentSeverity, ...rawOptions] = rule;
      const finalSeverity = severity !== null ? severity : currentSeverity;

      // Get existing config
      const existingConfig = { paths: [], patterns: [] };
      for (const opt of rawOptions) {
        if (typeof opt === 'string' || (typeof opt === 'object' && opt && 'name' in opt)) {
          existingConfig.paths.push(opt);
        } else if (typeof opt === 'object' && opt && ('paths' in opt || 'patterns' in opt)) {
          if (opt.paths) existingConfig.paths.push(...opt.paths);
          if (opt.patterns) existingConfig.patterns.push(...opt.patterns);
        }
      }

      // Remove duplicates from existing that will be prepended
      const newImports = Array.isArray(restrictedImports) ? restrictedImports : [restrictedImports];
      const filteredExisting = existingConfig.paths.filter(
        (existing) =>
          !newImports.some((newImport) => {
            const existingName = typeof existing === 'string' ? existing : existing.name;
            const newName = typeof newImport === 'string' ? newImport : newImport.name;
            return existingName === newName;
          })
      );

      // Prepend new imports
      override.rules['no-restricted-imports'] = [
        finalSeverity,
        {
          paths: [...newImports, ...filteredExisting],
          patterns: existingConfig.patterns,
        },
      ];
    }
  }
}

/**
 * Replace all restricted imports with new value
 */
function replaceRestrictedImports(config, newValue, severity) {
  const overridesWithRule = config.overrides.filter(
    (override) => override.rules && 'no-restricted-imports' in override.rules
  );

  for (const override of overridesWithRule) {
    const existingRule = override.rules['no-restricted-imports'];

    if (severity !== null && Array.isArray(existingRule)) {
      // Update severity if provided
      if (Array.isArray(newValue) && newValue.length > 0) {
        override.rules['no-restricted-imports'] = [severity, ...newValue.slice(1)];
      } else {
        override.rules['no-restricted-imports'] = [severity, newValue];
      }
    } else if (severity !== null) {
      // Add severity to new value
      override.rules['no-restricted-imports'] = [severity, newValue];
    } else {
      // Use new value as-is
      override.rules['no-restricted-imports'] = newValue;
    }
  }
}

/**
 * Remove the entire no-restricted-imports rule
 */
function removeEntireRule(config) {
  for (const override of config.overrides) {
    if (override.rules) {
      delete override.rules['no-restricted-imports'];
    }
  }
}

/**
 * Remove specific imports from the restriction
 */
function removeSpecificImports(config, importsToRemove, severity) {
  const toRemove = Array.isArray(importsToRemove) ? importsToRemove : [importsToRemove];

  const overridesWithRule = config.overrides.filter(
    (override) => override.rules && 'no-restricted-imports' in override.rules
  );

  for (const override of overridesWithRule) {
    const rule = override.rules['no-restricted-imports'];

    if (Array.isArray(rule) && rule.length >= 2) {
      const [currentSeverity, ...rawOptions] = rule;
      const finalSeverity = severity !== null ? severity : currentSeverity;

      // Get existing config
      const existingConfig = { paths: [], patterns: [] };
      for (const opt of rawOptions) {
        if (typeof opt === 'string' || (typeof opt === 'object' && opt && 'name' in opt)) {
          existingConfig.paths.push(opt);
        } else if (typeof opt === 'object' && opt && ('paths' in opt || 'patterns' in opt)) {
          if (opt.paths) existingConfig.paths.push(...opt.paths);
          if (opt.patterns) existingConfig.patterns.push(...opt.patterns);
        }
      }

      // Filter out imports to remove
      const filteredPaths = existingConfig.paths.filter(
        (existing) =>
          !toRemove.some((removeItem) => {
            const existingName = typeof existing === 'string' ? existing : existing.name;
            const removeName = typeof removeItem === 'string' ? removeItem : removeItem.name;
            return existingName === removeName;
          })
      );

      override.rules['no-restricted-imports'] = [
        finalSeverity,
        {
          paths: filteredPaths,
          patterns: existingConfig.patterns,
        },
      ];
    }
  }
}

module.exports = noRestrictedImportsHandler;
