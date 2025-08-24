/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const {
  transformOverridesForNestedContext,
} = require('./utils/transform_overrides_for_nested_context');
const { getRuleHandler } = require('./rule_handlers');

// eslint-disable-next-line import/no-dynamic-require, @kbn/imports/no_boundary_crossing
const rootConfig = require('../../../.eslintrc');

const rootDir = path.resolve(__dirname, '..', '..', '..');

/**
 * @typedef {Object} RuleOverrideConfig
 * @property {'merge' | 'replace' | 'remove' | 'append' | 'prepend'} [strategy='merge'] - How to apply the rule
 * @property {'error' | 'warn' | 'off' | 0 | 1 | 2} [severity] - Optional severity override (only for merge/replace/append/prepend)
 * @property {*} value - The rule value/options to apply
 * @property {Function} [customHandler] - Optional custom handler for this specific call
 */

/**
 * @typedef {Object} CreateRuleOverridesOptions
 * @property {string} childConfigDir - Directory path for nested eslint configuration
 * @property {Object.<string, RuleOverrideConfig|*>} rules - Rules to override with their configs
 */

/**
 * Creates ESLint rule overrides for nested configuration contexts
 *
 * @param {CreateRuleOverridesOptions} options
 * @returns {Array<Object>} Array of ESLint override configurations
 *
 * @example
 * // Simple usage - uses default merge strategy
 * createRuleOverrides({
 *   childConfigDir: __dirname,
 *   rules: {
 *     'no-restricted-imports': ['lodash', 'moment']
 *   }
 * })
 *
 * @example
 * // Advanced usage with strategies and severity
 * createRuleOverrides({
 *   childConfigDir: __dirname,
 *   rules: {
 *     'no-restricted-imports': {
 *       strategy: 'merge',
 *       severity: 'error',
 *       value: ['lodash', 'moment']
 *     },
 *     'no-console': {
 *       strategy: 'replace',
 *       value: ['warn', { allow: ['warn', 'error'] }]
 *     },
 *     'no-debugger': {
 *       strategy: 'remove'
 *     }
 *   }
 * })
 */
function createRuleOverrides(options = {}) {
  const { childConfigDir, rules = {} } = options;

  // Validate inputs
  if (!childConfigDir) {
    throw new Error(
      'No childConfigDir provided. Please pass __dirname in your nested .eslintrc.js file.'
    );
  }

  if (!rules || Object.keys(rules).length === 0) {
    throw new Error('No rules provided. Please specify at least one rule to override.');
  }

  // Deep clone the root config
  const clonedRootConfig = JSON.parse(JSON.stringify(rootConfig));

  if (!clonedRootConfig.overrides || clonedRootConfig.overrides.length === 0) {
    return [];
  }

  // Process each rule through its handler
  const processedRuleNames = new Set();

  for (const [ruleName, ruleConfig] of Object.entries(rules)) {
    const config = normalizeRuleConfig(ruleConfig);
    const handler = config.customHandler || getRuleHandler(ruleName);

    if (!handler) {
      // Use default handler for basic operations
      applyDefaultHandler(clonedRootConfig, ruleName, config);
    } else {
      // Apply the rule-specific handler
      handler.process(clonedRootConfig, config, {
        rootDir,
        childConfigDir,
        ruleName,
      });
    }

    processedRuleNames.add(ruleName);
  }

  // Transform overrides for nested context, filtering to only processed rules
  return transformOverridesForNestedContext(
    clonedRootConfig.overrides,
    rootDir,
    childConfigDir,
    (override) => {
      if (!override.rules) return false;
      // Include override if it contains any of the processed rules
      return Object.keys(override.rules).some((ruleName) => processedRuleNames.has(ruleName));
    }
  );
}

/**
 * Normalize rule config to standard format
 */
function normalizeRuleConfig(ruleConfig) {
  // If it's not an object, assume it's the value with default merge strategy
  if (!ruleConfig || typeof ruleConfig !== 'object') {
    return {
      strategy: 'merge',
      value: ruleConfig,
      severity: undefined,
    };
  }

  // If it's an object, check if it has our config properties
  // If it has 'value' or 'strategy' or 'severity' or 'customHandler', treat it as config
  // Otherwise treat the whole object as the value
  const isConfigObject =
    'strategy' in ruleConfig ||
    'value' in ruleConfig ||
    'severity' in ruleConfig ||
    'customHandler' in ruleConfig;

  if (!isConfigObject) {
    // It's an object but not our config format, treat it as the value
    return {
      strategy: 'merge',
      value: ruleConfig,
      severity: undefined,
    };
  }

  // It's our config object format
  return {
    strategy: ruleConfig.strategy || 'merge',
    value: ruleConfig.value,
    severity: ruleConfig.severity,
    customHandler: ruleConfig.customHandler,
  };
}

const severityMap = {
  off: 0,
  warn: 1,
  error: 2,
  0: 0,
  1: 1,
  2: 2,
};
/**
 * Normalize severity to ESLint format
 */
function normalizeSeverity(severity) {
  return severityMap[severity] != null ? severityMap[severity] : null;
}

/**
 * Default handler for rules without specific handlers
 */
function applyDefaultHandler(config, ruleName, ruleConfig) {
  const { strategy, value, severity } = ruleConfig;

  if (!config.overrides) return;

  for (const override of config.overrides) {
    if (!override.rules) continue;

    switch (strategy) {
      case 'remove':
        delete override.rules[ruleName];
        break;

      case 'replace':
        if (ruleName in override.rules) {
          override.rules[ruleName] = value;
        }
        break;

      case 'merge':
      case 'append':
      case 'prepend':
        if (ruleName in override.rules) {
          // For default handler, update severity if provided and keep/replace value
          const existingRule = override.rules[ruleName];
          const normalizedSeverity = normalizeSeverity(severity);

          if (Array.isArray(existingRule) && existingRule.length > 0) {
            // Normalize the existing severity too
            const currentSeverity = normalizeSeverity(existingRule[0]);
            override.rules[ruleName] = [
              normalizedSeverity !== null ? normalizedSeverity : currentSeverity,
              value,
            ];
          } else {
            override.rules[ruleName] = value;
          }
        }
        break;

      default:
        console.warn(`Unknown strategy '${strategy}' for rule '${ruleName}'`);
    }
  }
}

module.exports = {
  createRuleOverrides,
  normalizeRuleConfig,
  normalizeSeverity,
  applyDefaultHandler,
};
