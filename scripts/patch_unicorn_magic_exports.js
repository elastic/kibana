/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/imports/uniform_imports */
require('../src/setup_node_env/root');

import('../src/dev/kbn_pm/src/commands/bootstrap/patch_unicorn_magic_exports.mjs')
  .then(async ({ patchUnicornMagicExports }) => {
    await patchUnicornMagicExports({
      success(msg) {
        console.log(msg);
      },
      info(msg) {
        console.log(msg);
      },
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
