"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerProxyRoute = void 0;

var _validation_config = require("./validation_config");

var _create_handler = require("./create_handler");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const registerProxyRoute = deps => {
  deps.router.post({
    path: '/api/console/proxy',
    options: {
      tags: ['access:console'],
      body: {
        output: 'stream',
        parse: false
      }
    },
    validate: _validation_config.routeValidationConfig
  }, (0, _create_handler.createHandler)(deps));
};

exports.registerProxyRoute = registerProxyRoute;