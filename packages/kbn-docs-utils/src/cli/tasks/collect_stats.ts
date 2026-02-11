/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transaction } from 'elastic-apm-node';
import type { ToolingLog } from '@kbn/tooling-log';
import { collectApiStatsForPlugin } from '../../stats';
import { countEslintDisableLines } from '../../count_eslint_disable';
import { countEnzymeImports } from '../../count_enzyme_imports';
import type { AllPluginStats, BuildApiMapResult, CliOptions, SetupProjectResult } from '../types';

/**
 * Collects statistics for all plugins.
 *
 * This task:
 * - Collects API statistics (missing comments, any types, etc.)
 * - Counts ESLint disable lines
 * - Counts Enzyme imports
 * - Combines all stats into a single object per plugin
 *
 * @param setupResult - Result from setup_project task.
 * @param apiMapResult - Result from build_api_map task.
 * @param log - Tooling log instance.
 * @param transaction - APM transaction for tracking.
 * @param options - CLI options including stats and pluginFilter.
 * @returns All plugin stats keyed by plugin ID.
 */
export async function collectStats(
  setupResult: SetupProjectResult,
  apiMapResult: BuildApiMapResult,
  log: ToolingLog,
  transaction: Transaction,
  options: CliOptions
): Promise<AllPluginStats> {
  const { plugins, pathsByPlugin } = setupResult;
  const { pluginApiMap, missingApiItems, referencedDeprecations, adoptionTrackedAPIs } =
    apiMapResult;

  const allPluginStats: AllPluginStats = {};

  for (const plugin of plugins) {
    const id = plugin.id;

    if (options.stats && options.pluginFilter && !options.pluginFilter.includes(plugin.id)) {
      continue;
    }

    const spanApiStatsForPlugin = transaction.startSpan(
      `build_api_docs.collectApiStatsForPlugin-${id}`,
      'stats'
    );

    const pluginApi = pluginApiMap[id];
    const paths = pathsByPlugin.get(plugin) ?? [];

    allPluginStats[id] = {
      ...(await countEslintDisableLines(paths)),
      ...(await countEnzymeImports(paths)),
      ...collectApiStatsForPlugin(
        pluginApi,
        missingApiItems,
        referencedDeprecations,
        adoptionTrackedAPIs
      ),
      owner: plugin.manifest.owner,
      description: plugin.manifest.description,
      isPlugin: plugin.isPlugin,
    };

    spanApiStatsForPlugin?.end();
  }

  return allPluginStats;
}
