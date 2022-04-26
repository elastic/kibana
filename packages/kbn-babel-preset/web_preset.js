/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = (_, options = {}) => {
  return {
    // This preset is called from the /src/dev/bazel/jsts_transpiler.bzl.
    // Ideally, it should simply use the `webpack_preset` with some opts but, since it is called via CLI options,
    // Babel currently does not provide a way to pass options to the presets.
    presets: [[require('./webpack_preset'), { ...options, esmodules: true }]],
  };
};
