/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var pkg = require('../../package.json');

// Note: This is written in ES5 so we can run this before anything else
// and gives support for older NodeJS versions
var currentVersion = (process && process.version) || null;
var rawRequiredVersion = (pkg && pkg.engines && pkg.engines.node) || null;
var requiredVersion = rawRequiredVersion ? 'v' + rawRequiredVersion : rawRequiredVersion;
var isVersionValid = !!currentVersion && !!requiredVersion && currentVersion === requiredVersion;

// Validates current the NodeJS version compatibility when Kibana starts.
if (!isVersionValid) {
  var errorMessage =
    'Kibana does not support the current Node.js version ' +
    currentVersion +
    '. Please use Node.js ' +
    requiredVersion +
    '.';

  // Actions to apply when validation fails: error report + exit.
  console.error(errorMessage);
  process.exit(1);
}
