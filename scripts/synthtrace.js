/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@babel/register')({
  extensions: ['.ts', '.js'],
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
});

// We have to import directly from package since scenarios and worker.js are imported dynamically,
// If we import the package (require('@kbn/apm-synthtrace')) the program will be executed on the compiled files, and thus we need to
// compile scenarios with `yarn kbn bootstrap` every time scenario changes.

require('@kbn/apm-synthtrace/src/cli').runSynthtrace();
