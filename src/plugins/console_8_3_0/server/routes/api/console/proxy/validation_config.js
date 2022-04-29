"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.routeValidationConfig = void 0;

var _configSchema = require("@kbn/config-schema");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const acceptedHttpVerb = _configSchema.schema.string({
  validate: method => {
    return ['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].some(verb => verb.toLowerCase() === method.toLowerCase()) ? undefined : `Method must be one of, case insensitive ['HEAD', 'GET', 'POST', 'PUT', 'DELETE']. Received '${method}'.`;
  }
});

const nonEmptyString = _configSchema.schema.string({
  validate: s => s === '' ? 'Expected non-empty string' : undefined
});

const routeValidationConfig = {
  query: _configSchema.schema.object({
    method: acceptedHttpVerb,
    path: nonEmptyString,
    withProductOrigin: _configSchema.schema.maybe(_configSchema.schema.boolean())
  }),
  body: _configSchema.schema.stream()
};
exports.routeValidationConfig = routeValidationConfig;