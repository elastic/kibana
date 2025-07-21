/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../src/setup_node_env');

if (process.argv.length !== 3) {
  var scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');

  console.log(`
    Usage: node ${scriptName} <baseBranch>
    e.g. node ${scriptName} main

    Compares the saved object type definitions from the current branch (current working tree) against:
    - The latest snapshot from baseBranch.
    - The latest Serverless release snapshot.

    It performs various sanity checks to ensure that current changes (if any) are not breaking the Saved Object migrations.
  `);

  process.exit(0);
}

var baseBranch = process.argv[2];
require('@kbn/saved-object-types').checkSavedObjectTypes(baseBranch);
