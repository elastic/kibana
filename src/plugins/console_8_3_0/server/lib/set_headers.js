"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setHeaders = setHeaders;

var _lodash = require("lodash");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function setHeaders(originalHeaders, newHeaders) {
  if (!(0, _lodash.isPlainObject)(originalHeaders)) {
    throw new Error(`Expected originalHeaders to be an object, but ${typeof originalHeaders} given`);
  }

  if (!(0, _lodash.isPlainObject)(newHeaders)) {
    throw new Error(`Expected newHeaders to be an object, but ${typeof newHeaders} given`);
  }

  return { ...originalHeaders,
    ...newHeaders
  };
}