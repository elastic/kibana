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
import { initApm } from '@kbn/apm-config-loader';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';

import { findPlugins } from './find_plugins';
import { getPathsByPackage } from './get_paths_by_package';
import { countEnzymeImports } from './count_enzyme_imports';
import { countEslintDisableLines } from './count_eslint_disable';

const rootDir = Path.join(__dirname, '../../..');

interface CliFlags {
  plugin?: string | string[];
  package?: string | string[];
}

const toStringArray = (value?: string | string[]): string[] | undefined => {
  if (!value) return undefined;
  return typeof value === 'string' ? [value] : value;
};

const startApm = () => {
  if (!apm.isStarted()) {
    initApm(process.argv, rootDir, false, 'report_package_metrics_cli');
  }
};

export const runReportPackageMetrics = async (log: ToolingLog, flags: CliFlags) => {
  startApm();
  const transaction = apm.startTransaction('report-package-metrics', 'kibana-cli');

  try {
    const pluginFilter = toStringArray(flags.plugin);
    const packageFilter = toStringArray(flags.package);
    const reporter = CiStatsReporter.fromEnv(log);

    const spanPlugins = transaction.startSpan('report_package_metrics.findPlugins', 'setup');
    const plugins = findPlugins({ pluginFilter, packageFilter });
    spanPlugins?.end();
    log.info(`Scanning ${plugins.length} package(s) for Enzyme imports and ESLint disables.`);

    const spanPaths = transaction.startSpan('report_package_metrics.getPathsByPackage', 'setup');
    const pathsByPackage = await getPathsByPackage(plugins);
    spanPaths?.end();

    for (const plugin of plugins) {
      const paths = pathsByPackage.get(plugin) ?? [];
      if (paths.length === 0) continue;

      const span = transaction.startSpan(
        `report_package_metrics.scanPackage-${plugin.id}`,
        'stats'
      );

      const { enzymeImportCount } = await countEnzymeImports(paths);
      const { eslintDisableLineCount, eslintDisableFileCount } = await countEslintDisableLines(
        paths
      );

      const pluginTeam = plugin.manifest.owner.name;

      reporter.metrics([
        {
          id: plugin.id,
          meta: { pluginTeam },
          group: 'Enzyme imports',
          value: enzymeImportCount,
        },
        {
          id: plugin.id,
          meta: { pluginTeam },
          group: 'ESLint disabled line counts',
          value: eslintDisableLineCount,
        },
        {
          id: plugin.id,
          meta: { pluginTeam },
          group: 'ESLint disabled in files',
          value: eslintDisableFileCount,
        },
        {
          id: plugin.id,
          meta: { pluginTeam },
          group: 'Total ESLint disabled count',
          value: eslintDisableLineCount + eslintDisableFileCount,
        },
      ]);

      span?.end();
    }
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
      log: { defaultLevel: 'info' },
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
