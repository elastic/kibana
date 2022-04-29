"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EsLegacyConfigService = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _rxjs = require("rxjs");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
class EsLegacyConfigService {
  constructor() {
    (0, _defineProperty2.default)(this, "config", void 0);
    (0, _defineProperty2.default)(this, "config$", void 0);
    (0, _defineProperty2.default)(this, "configSub", void 0);
  }

  setup(config$) {
    this.config$ = config$;
    this.configSub = this.config$.subscribe(config => {
      this.config = config;
    });
  }

  stop() {
    if (this.configSub) {
      this.configSub.unsubscribe();
    }
  }

  async readConfig() {
    if (!this.config$) {
      throw new Error('Could not read elasticsearch config, this service has not been setup!');
    }

    if (!this.config) {
      return (0, _rxjs.firstValueFrom)(this.config$);
    }

    return this.config;
  }

}

exports.EsLegacyConfigService = EsLegacyConfigService;