/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.configSchema = void 0;

const _configSchema = require('@kbn/config-schema');

const configSchema = _configSchema.schema.object({
  disableWelcomeScreen: _configSchema.schema.boolean({
    defaultValue: false,
  }),
});

exports.configSchema = configSchema;
