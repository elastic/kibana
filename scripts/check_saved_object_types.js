/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../src/setup_node_env');

if (process.argv.length !== 2) {
  var scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');

  console.log(`
    Usage: node ${scriptName}

    Compares the saved object type definitions from the current branch (current working tree) against:
    - A snapshot from the base branch of the PR (based on the merge-base commit, if available).
    - The latest Serverless release snapshot.

    It performs various sanity checks to ensure that current changes (if any) are not breaking the Saved Object migrations.
  `);

  process.exit(0);
}

require('@kbn/saved-object-types').checkSavedObjectTypes(process.env.GITHUB_PR_MERGE_BASE);
