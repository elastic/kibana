/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @typedef {Object} RuleHandler
 * @property {string} ruleName - Name of the ESLint rule this handler processes
 * @property {Function} process - Function to process the rule
 */

// Registry of all available rule handlers
const handlers = new Map();

/**
 * Register a rule handler
 * @param {string} ruleName
 * @param {RuleHandler} handler
 */
function registerRuleHandler(ruleName, handler) {
  if (!ruleName || typeof ruleName !== 'string') {
    throw new Error('Rule name must be a non-empty string');
  }
  if (!handler || typeof handler.process !== 'function') {
    throw new Error('Handler must have a process function');
  }
  handlers.set(ruleName, handler);
}

/**
 * Get handler for a specific rule
 * @param {string} ruleName
 * @returns {RuleHandler|null}
 */
function getRuleHandler(ruleName) {
  return handlers.get(ruleName) || null;
}

/**
 * Clear all registered handlers (mainly for testing)
 */
function clearHandlers() {
  handlers.clear();
}

/**
 * Get all registered handler names
 * @returns {string[]}
 */
function getRegisteredHandlers() {
  return Array.from(handlers.keys());
}

registerRuleHandler('no-restricted-imports', require('./no-restricted-imports'));

module.exports = {
  registerRuleHandler,
  getRuleHandler,
  clearHandlers,
  getRegisteredHandlers,
};
