/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');

if (!process.env.npm_lifecycle_event || process.env.BUILD_TS_REFS_ON_BOOTSTRAP) {
  require('../src/dev/typescript').runBuildRefsCli();
} else {
  console.warn('ran from yarn script without env BUILD_TS_REFS_ON_BOOTSTRAP=true');
}
