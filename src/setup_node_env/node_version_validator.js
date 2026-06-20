/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var pkg =
  __filename.indexOf('node_modules') === -1
    ? // when running from src/
      require('../../package.json')
    : // when installed as a package
      // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
      require('../../../package.json');

if (!process.env.UNSAFE_DISABLE_NODE_VERSION_VALIDATION) {
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

    // In development (repo checkout), add actionable guidance.
    // .nvmrc only exists in the repo, not in production builds.
    var isDev = false;
    try {
      require('fs').accessSync(require('path').resolve(__dirname, '..', '..', '.nvmrc'));
      isDev = true;
    } catch (e) {
      /* not in repo / production build */
    }

    if (isDev) {
      errorMessage +=
        '\n\nTo fix, run your command with the setup script:' +
        '\n  source scripts/ensure_llm_sandbox_env.sh && <your command>' +
        '\n\nOr manually switch Node.js via nvm:' +
        '\n  export NVM_DIR="$HOME/.nvm"' +
        '\n  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' +
        '\n  nvm install' +
        '\n  nvm use' +
        '\n\nIf nvm is not available, you can bypass this check (unsafe):' +
        '\n  export UNSAFE_DISABLE_NODE_VERSION_VALIDATION=1';
    }

    // Actions to apply when validation fails: error report + exit.
    console.error(errorMessage);
    process.exit(1);
  }
}
