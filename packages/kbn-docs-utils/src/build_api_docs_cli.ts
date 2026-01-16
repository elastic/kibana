/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import apm, { type Transaction } from 'elastic-apm-node';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { initApm } from '@kbn/apm-config-loader';

import { pathsOutsideScopes } from './build_api_declarations/utils';
import {
  parseCliFlags,
  setupProject,
  buildApiMap,
  collectStats,
  writeDocs,
  reportMetrics,
  type CliFlags,
  type CliContext,
} from './cli';

const rootDir = Path.join(__dirname, '../../..');
initApm(process.argv, rootDir, false, 'build_api_docs_cli');

async function endTransactionWithFailure(transaction: Transaction | null) {
  if (transaction !== null) {
    transaction.setOutcome('failure');
    transaction.end();
    await apm.flush();
  }
}

export function runBuildApiDocsCli() {
  run(
    async ({ log, flags }) => {
      const transaction = apm.startTransaction('build-api-docs', 'kibana-cli');
      const spanSetup = transaction.startSpan('build_api_docs.setup', 'setup');

      let options;
      try {
        options = parseCliFlags(flags as CliFlags);
      } catch (error) {
        await endTransactionWithFailure(transaction);
        throw error;
      }

      const outputFolder = Path.resolve(REPO_ROOT, 'api_docs');

      const context: CliContext = {
        log,
        transaction,
        outputFolder,
      };

      spanSetup?.end();

      // Setup project: discover plugins, resolve paths, create TypeScript project
      const setupResult = await setupProject(context, options);

      // Build API map: analyze TypeScript and extract API declarations
      const apiMapResult = buildApiMap(
        setupResult.project,
        setupResult.plugins,
        log,
        transaction,
        options
      );

      // Collect stats: gather statistics for all plugins
      const allPluginStats = await collectStats(
        setupResult,
        apiMapResult,
        log,
        transaction,
        options
      );

      // Report metrics: send to CI stats and log validation results
      reportMetrics(setupResult, apiMapResult, allPluginStats, log, transaction, options);

      // Write docs: generate all documentation files
      await writeDocs(context, setupResult, apiMapResult, allPluginStats, options);

      if (Object.values(pathsOutsideScopes).length > 0) {
        log.warning(`Found paths outside of normal scope folders:`);
        log.warning(pathsOutsideScopes);
      }

      transaction.end();
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: ['plugin', 'stats'],
        boolean: ['references'],
        help: `
          --plugin           Optionally, run for only a specific plugin
          --stats            Optionally print API stats. Must be one or more of: any, comments or exports.
                             In combination with a single plugin filter this option will skip writing any
                             API docs as a tradeoff to just produce the stats output more quickly.
          --references       Collect references for API items
        `,
      },
    }
  );
}
