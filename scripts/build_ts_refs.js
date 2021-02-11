/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');

if (process.env.KBN_NO_TS_REFS === 'true') {
  console.log('`KBN_NO_TS_REFS=true`, skipping');
} else {
  require('../src/dev/typescript').runBuildRefsCli();
}
