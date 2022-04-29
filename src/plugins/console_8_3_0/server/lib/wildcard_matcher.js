"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WildcardMatcher = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _minimatch = require("minimatch");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
class WildcardMatcher {
  constructor(wildcardPattern, emptyVal) {
    (0, _defineProperty2.default)(this, "pattern", void 0);
    (0, _defineProperty2.default)(this, "matcher", void 0);
    this.wildcardPattern = wildcardPattern;
    this.emptyVal = emptyVal;
    this.pattern = String(this.wildcardPattern || '*');
    this.matcher = new _minimatch.Minimatch(this.pattern, {
      noglobstar: true,
      dot: true,
      nocase: true,
      matchBase: true,
      nocomment: true
    });
  }

  match(candidate) {
    const empty = !candidate || candidate === this.emptyVal;

    if (empty && this.pattern === '*') {
      return true;
    }

    return this.matcher.match(candidate || '');
  }

}

exports.WildcardMatcher = WildcardMatcher;