/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var peggy = require('@kbn/peggy');

module.exports = function peggyLoader(source) {
  var result = peggy.getJsSourceSync({
    path: this.resourcePath,
    content: source.toString(),
    format: 'esm',
    optimize: 'size',
  });
  if (result.config) {
    this.addDependency(result.config.path);
  }
  return result.source;
};
