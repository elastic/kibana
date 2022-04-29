"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProxyConfigCollection = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _lodash = require("lodash");

var _url = require("url");

var _proxy_config = require("./proxy_config");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
class ProxyConfigCollection {
  constructor(configs = []) {
    (0, _defineProperty2.default)(this, "configs", void 0);
    this.configs = configs.map(settings => new _proxy_config.ProxyConfig(settings));
  }

  hasConfig() {
    return Boolean(this.configs.length);
  }

  configForUri(uri) {
    const parsedUri = (0, _url.parse)(uri);
    const settings = this.configs.map(config => config.getForParsedUri(parsedUri));
    return (0, _lodash.defaultsDeep)({}, ...settings);
  }

}

exports.ProxyConfigCollection = ProxyConfigCollection;