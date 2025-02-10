/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { isObj } = require('./parse_helpers');

const PLUGIN_CATEGORY = Symbol('pluginCategory');

/**
 *
 * @param {unknown} v
 * @returns {v is import('./types').PluginCategoryInfo}
 */
const isValidPluginCategoryInfo = (v) =>
  isObj(v) &&
  typeof v.oss === 'boolean' &&
  typeof v.example === 'boolean' &&
  typeof v.testPlugin === 'boolean';

module.exports = { PLUGIN_CATEGORY, isValidPluginCategoryInfo };
