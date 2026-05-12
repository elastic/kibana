/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import apm from 'elastic-apm-node';
import type { ToolingLog } from '@kbn/tooling-log';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { initApm } from '@kbn/apm-config-loader';

import {
  parseCliFlags,
  setupProject,
  buildApiMap,
  collectStats,
  reportMetrics,
  type CliFlags,
  type CliContext,
} from './cli';

const rootDir = Path.join(__dirname, '../../..');

const startApm = () => {
  if (!apm.isStarted()) {
    initApm(process.argv, rootDir, false, 'report_package_metrics_cli');
  }
};

export const runReportPackageMetrics = async (log: ToolingLog, flags: CliFlags) => {
  startApm();
  const transaction = apm.startTransaction('report-package-metrics', 'kibana-cli');

  try {
    const options = parseCliFlags(flags);

    const outputFolder = Path.resolve(REPO_ROOT, 'api_docs_metrics');
    const context: CliContext = {
      log,
      transaction,
      outputFolder,
    };

    const setupResult = await setupProject(context, options);
    const apiMapResult = buildApiMap(
      setupResult.project,
      setupResult.plugins,
      setupResult.allPlugins,
      log,
      transaction,
      options
    );

    const allPluginStats = await collectStats(setupResult, apiMapResult, log, transaction, options);

    reportMetrics(setupResult, apiMapResult, allPluginStats, log, transaction, options);
  } catch (error) {
    transaction?.setOutcome('failure');
    throw error;
  } finally {
    transaction?.end();
    await apm.flush();
  }
};

export const runReportPackageMetricsCli = () => {
  run(
    async ({ log, flags }) => {
      await runReportPackageMetrics(log, flags as CliFlags);
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: ['plugin', 'package'],
        help: `
          --plugin           Optionally, run for only a specific plugin by its plugin ID (plugin.id in kibana.jsonc).
          --package          Optionally, run for only a specific package by its package ID (id in kibana.jsonc, e.g., @kbn/core).
        `,
      },
    }
  );
};
