"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerRoutes = void 0;

var _es_config = require("./api/console/es_config");

var _proxy = require("./api/console/proxy");

var _spec_definitions = require("./api/console/spec_definitions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const registerRoutes = dependencies => {
  (0, _es_config.registerEsConfigRoute)(dependencies);
  (0, _proxy.registerProxyRoute)(dependencies);
  (0, _spec_definitions.registerSpecDefinitionsRoute)(dependencies);
};

exports.registerRoutes = registerRoutes;