/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { checkServerImportGraph } from './src/check_server_import_graph';
import { checkTestRunnerImportGraph } from './src/check_test_runner_import_graph';

run(
  async ({ log, flagsReader }) => {
    const modules = flagsReader.arrayOfStrings('module');
    const bannedNodeModules = modules?.length ? new Set(modules) : undefined;
    const server = await checkServerImportGraph({ log, bannedNodeModules });
    const testRunners = await checkTestRunnerImportGraph({ log, bannedNodeModules });

    if (!server || !testRunners) {
      throw createFailError('Banned node modules are reachable. See the errors above.');
    }
  },
  {
    usage: 'node scripts/check_server_import_graph [--module <name>]...',
    description:
      'Statically walks the import graph from every server entry point, FTR config and Scout file ' +
      'and fails when a banned node module is reachable from it.',
    flags: {
      string: ['module'],
      help: `
        --module <name>  Node module to look for instead of the default banned set, for ad-hoc
                         exploration. Can be passed multiple times.
      `,
    },
  }
);
