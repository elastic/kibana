/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const fs = require('fs');

function isKibanaRoot(maybeKibanaRoot) {
  try {
    const packageJsonPath = path.join(maybeKibanaRoot, 'package.json');
    fs.accessSync(packageJsonPath, fs.constants.R_OK);
    const packageJsonContent = fs.readFileSync(packageJsonPath);
    return JSON.parse(packageJsonContent).name === 'kibana';
  } catch (e) {
    return false;
  }
}

module.exports = function findKibanaRoot() {
  let maybeKibanaRoot = path.resolve(__dirname, '../../..');

  // when using syslinks, __dirname reports outside of the repo
  // if that's the case, the path will contain .cache/bazel
  if (!maybeKibanaRoot.includes('.cache/bazel')) {
    return maybeKibanaRoot;
  }

  // process.argv[1] would be the eslint binary, a correctly-set editor
  // will use a local eslint inside the repo node_modules and its value
  // should be `ACTUAL_KIBANA_ROOT/node_modules/.bin/eslint`
  maybeKibanaRoot = path.resolve(process.argv[1], '../../../');
  if (isKibanaRoot(maybeKibanaRoot)) {
    return maybeKibanaRoot;
  }

  // eslint should run on the repo root level
  // try to use process.cwd as the kibana root
  maybeKibanaRoot = process.cwd();
  if (isKibanaRoot(maybeKibanaRoot)) {
    return maybeKibanaRoot;
  }

  // fallback to the first predicted path (original script)
  return maybeKibanaRoot;
};
