/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/**
 * Default values for refactoring schemas to component references.
 *
 * @type {Object}
 * @property {boolean} extractPrimitives - Extract primitive properties as separate components
 * @property {boolean} removeProperties - Remove extracted properties from parent components
 * @property {boolean} extractEmpty - Extract empty object schemas { type: 'object' }
 */
const STRATEGY_DEFAULTS = {
  extractPrimitives: false,
  removeProperties: false,
  extractEmpty: true,
};

const MAX_RECURSION_DEPTH = 100;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

module.exports = { STRATEGY_DEFAULTS, MAX_RECURSION_DEPTH, HTTP_METHODS };
