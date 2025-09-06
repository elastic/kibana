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
 * @property {'merge' | 'replace' | 'remove' } [strategy] - Rule application strategy (REQUIRED, except when only changing severity)
 * @property {'error' | 'warn' | 'off' | 0 | 1 | 2} [severity] - Optional severity override (only for merge/replace)
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
 *       customHandler: {
 *       process(config, ruleConfig, context) {
 *         // config decoration logic here
 *       }
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
  // Null/undefined is an error
  if (ruleConfig === null || ruleConfig === undefined) {
    throw new Error('Rule configuration cannot be null or undefined');
  }

  // Non-objects are errors - we require explicit config
  if (typeof ruleConfig !== 'object') {
    throw new Error(
      `Rule configuration must be an object. ` +
        `Use { severity: 'error' } to change severity, ` +
        `{ strategy: 'replace', value: [...] } to replace, ` +
        `or { strategy: 'remove' } to remove.`
    );
  }

  // Check if it's our config object format
  const isConfigObject =
    'strategy' in ruleConfig ||
    'value' in ruleConfig ||
    'severity' in ruleConfig ||
    'customHandler' in ruleConfig;

  if (!isConfigObject) {
    throw new Error(
      `Invalid rule configuration object. ` +
        `Expected properties: 'strategy', 'value', 'severity', or 'customHandler'. ` +
        `Got: ${JSON.stringify(Object.keys(ruleConfig))}. ` +
        `Use { severity: 'error' } to change severity, ` +
        `{ strategy: 'replace', value: [...] } to replace, ` +
        `{ strategy: 'merge', value: [...] } to merge (requires handler), ` +
        `or { strategy: 'remove' } to remove.`
    );
  }

  // Special case: severity-only change
  if ('severity' in ruleConfig && !('strategy' in ruleConfig) && !('value' in ruleConfig)) {
    return {
      strategy: undefined,
      value: undefined,
      severity: ruleConfig.severity,
      customHandler: ruleConfig.customHandler,
    };
  }

  // Validate: if strategy is provided, value must be provided (except for 'remove')
  if ('strategy' in ruleConfig && ruleConfig.strategy !== 'remove' && !('value' in ruleConfig)) {
    throw new Error(
      `Strategy '${ruleConfig.strategy}' requires a 'value' property. ` +
        `Only 'remove' strategy can be used without a value.`
    );
  }

  // Validate: if value is provided, strategy must be provided
  if ('value' in ruleConfig && !('strategy' in ruleConfig)) {
    throw new Error(
      `'value' property requires a 'strategy' property. ` +
        `Specify how to apply the value: 'replace', 'merge' (requires handler), etc.`
    );
  }

  return {
    strategy: ruleConfig.strategy,
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

  // If only severity is provided (no strategy), just update severity
  if (!strategy && severity != null && value == null) {
    for (const override of config.overrides) {
      if (!override.rules || !(ruleName in override.rules)) continue;

      const existingRule = override.rules[ruleName];
      const normalizedSeverity = normalizeSeverity(severity);

      if (normalizedSeverity === null) {
        throw new Error(
          `Invalid severity '${severity}' for rule '${ruleName}'. ` +
            `Valid values are: 'off', 'warn', 'error', 0, 1, 2`
        );
      }

      if (Array.isArray(existingRule) && existingRule.length > 0) {
        override.rules[ruleName][0] = normalizedSeverity;
      } else if (typeof existingRule === 'string' || typeof existingRule === 'number') {
        override.rules[ruleName] = normalizedSeverity;
      }
    }
    return;
  }

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
        throw new Error(
          `Strategy '${strategy}' requires a custom handler for rule '${ruleName}'.\n` +
            `To use '${strategy}', provide a customHandler that implements the ${strategy} logic for this specific rule.\n` +
            `Example:\n` +
            `  '${ruleName}': {\n` +
            `    strategy: '${strategy}',\n` +
            `    value: ...,\n` +
            `    customHandler: {\n` +
            `      process(config, ruleConfig, context) {\n` +
            `        // Your custom ${strategy} logic here\n` +
            `      }\n` +
            `    }\n` +
            `  }`
        );

      default:
        throw new Error(
          `Unknown strategy '${strategy}' for rule '${ruleName}'.\n` +
            `Supported strategies: 'replace', 'remove', or provide only 'severity' to change severity.`
        );
    }
  }
}

module.exports = {
  createRuleOverrides,
  normalizeRuleConfig,
  normalizeSeverity,
  applyDefaultHandler,
};
