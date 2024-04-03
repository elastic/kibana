/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');

var command = process.argv[2];

switch (command) {
  case 'snapshot':
    require('../src/dev/so_migration/so_migration_snapshot_cli');
    break;
  case 'compare':
    require('../src/dev/so_migration/so_migration_compare_cli');
    break;
  default:
    printHelp();
    break;
}

function printHelp() {
  var scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');

  console.log(`
  Usage: node ${scriptName} <command>

  Commands:
    snapshot  - Create a snapshot of the current Saved Object types
    compare   - Compare two snapshots to reveal changes in Saved Object types
  `);

  process.exit(0);
}
