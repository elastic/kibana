#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Ensure Node env (ts-node/register, Babel, tsconfig paths, etc.)
require('../src/setup_node_env');

function main() {
  // Import TypeScript source that exports unit test groups via @kbn/test
  var UNIT_TEST_GROUPS = require('@kbn/test/src/jest/run_all/groups').UNIT_TEST_GROUPS;

  // Minimal validation and output
  if (!Array.isArray(UNIT_TEST_GROUPS)) {
    console.error('UNIT_TEST_GROUPS not found or not an array');
    process.exit(1);
  }

  var output = {
    groups: UNIT_TEST_GROUPS.map(function (g) {
      return { name: g.name, patterns: g.patterns };
    }),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main();
