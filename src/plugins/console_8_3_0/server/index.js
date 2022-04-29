"use strict";
console.log('OK I AM INSITE')
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "config", {
  enumerable: true,
  get: function () {
    return _config.config;
  }
});
exports.plugin = void 0;

var _plugin = require("./plugin");

var _config = require("./config");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const plugin = ctx => new _plugin.ConsoleServerPlugin(ctx);

console.log('OK I ALL EXPORTS')
exports.plugin = plugin;