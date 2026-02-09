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
  type CliOptions,
} from './cli';
import type { PluginOrPackage, MissingApiItemMap } from './types';
import type { AllPluginStats } from './cli/types';

type ValidationCheck = 'any' | 'comments' | 'exports';

const DEFAULT_VALIDATION_CHECKS: ValidationCheck[] = ['any', 'comments', 'exports'];

const rootDir = Path.join(__dirname, '../../..');

const startApm = () => {
  if (!apm.isStarted()) {
    initApm(process.argv, rootDir, false, 'check_package_docs_cli');
  }
};

interface ValidationResult {
  pluginId: string;
  passed: boolean;
}

const resolveValidationChecks = (options: CliOptions): ValidationCheck[] => {
  const checks =
    options.stats && options.stats.length > 0 ? options.stats : DEFAULT_VALIDATION_CHECKS;
  return checks as ValidationCheck[];
};

export const getValidationResults = (
  plugins: PluginOrPackage[],
  missingApiItems: MissingApiItemMap,
  checks: ValidationCheck[],
  pluginFilter: string[] | undefined,
  packageFilter: string[] | undefined,
  allPluginStats: AllPluginStats
): ValidationResult[] => {
  const shouldCheckAny = checks.includes('any');
  const shouldCheckComments = checks.includes('comments');
  const shouldCheckExports = checks.includes('exports');

  const hasPluginFilter = pluginFilter && pluginFilter.length > 0;
  const hasPackageFilter = packageFilter && packageFilter.length > 0;

  return plugins
    .filter((plugin) => {
      if (!hasPluginFilter && !hasPackageFilter) return true;
      if (plugin.isPlugin && hasPluginFilter) return pluginFilter.includes(plugin.id);
      if (!plugin.isPlugin && hasPackageFilter) return packageFilter.includes(plugin.id);
      return false;
    })
    .map((plugin) => {
      const pluginStats = allPluginStats[plugin.id];
      if (!pluginStats) {
        return { pluginId: plugin.id, passed: true };
      }
      const missingExports = missingApiItems[plugin.id]
        ? Object.keys(missingApiItems[plugin.id]).length
        : 0;

      const hasAnyIssues = shouldCheckAny && pluginStats.isAnyType.length > 0;
      const hasCommentIssues = shouldCheckComments && pluginStats.missingComments.length > 0;
      const hasExportIssues = shouldCheckExports && missingExports > 0;

      return {
        pluginId: plugin.id,
        passed: !(hasAnyIssues || hasCommentIssues || hasExportIssues),
      };
    });
};

export const runCheckPackageDocs = async (log: ToolingLog, flags: CliFlags) => {
  startApm();
  const transaction = apm.startTransaction('check-package-docs', 'kibana-cli');

  try {
    const options = parseCliFlags(flags);
    const checks = resolveValidationChecks(options);
    const optionsWithChecks: CliOptions = {
      ...options,
      stats: checks,
    };

    const outputFolder = Path.resolve(REPO_ROOT, 'api_docs_check');
    const context: CliContext = {
      log,
      transaction,
      outputFolder,
    };

    const setupResult = await setupProject(context, optionsWithChecks);
    const apiMapResult = buildApiMap(
      setupResult.project,
      setupResult.plugins,
      log,
      transaction,
      optionsWithChecks
    );

    const allPluginStats = await collectStats(
      setupResult,
      apiMapResult,
      log,
      transaction,
      optionsWithChecks
    );

    reportMetrics(setupResult, apiMapResult, allPluginStats, log, transaction, {
      ...optionsWithChecks,
      stats: checks,
    });

    const validationResults = getValidationResults(
      setupResult.plugins,
      apiMapResult.missingApiItems,
      checks,
      optionsWithChecks.pluginFilter,
      optionsWithChecks.packageFilter,
      allPluginStats
    );

    const failingPlugins = validationResults.filter((result) => !result.passed);

    if (failingPlugins.length > 0) {
      log.error(
        `Validation failed for ${failingPlugins.length} plugin(s): ${failingPlugins
          .map((plugin) => plugin.pluginId)
          .join(', ')}.`
      );
      process.exitCode = 1;
    } else {
      log.info('All plugins passed validation.');
    }
  } catch (error) {
    transaction?.setOutcome('failure');
    throw error;
  } finally {
    transaction?.end();
    await apm.flush();
  }
};

export const runCheckPackageDocsCli = () => {
  run(
    async ({ log, flags }) => {
      await runCheckPackageDocs(log, flags as CliFlags);
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: ['plugin', 'package', 'check'],
        help: `
          --plugin           Optionally, run for only a specific plugin by its plugin ID (plugin.id in kibana.jsonc).
          --package          Optionally, run for only a specific package by its package ID (id in kibana.jsonc, e.g., @kbn/core).
          --check            Optional. Specify validation checks: any, comments, exports, or all (default).
                             Can be provided multiple times to combine checks.
        `,
      },
    }
  );
};
