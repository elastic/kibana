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
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import type { ApiDeclaration } from '../../types';
import type { AllPluginStats, BuildApiMapResult, CliOptions, SetupProjectResult } from '../types';

/**
 * Generates a link to the GitHub source for an API declaration.
 *
 * TODO: clintandrewhall - allow `base` to be overridden in the instance of a CI build
 * associated with a PR.
 *
 * @param declaration - API declaration to generate link for.
 * @returns GitHub link to the source code.
 */
function getLink(declaration: ApiDeclaration): string {
  const base = `https://github.com/elastic/kibana/blob/main/${declaration.path}`;
  if (declaration.lineNumber) {
    return `${base}#L${declaration.lineNumber}`;
  }
  return `https://github.com/elastic/kibana/tree/main/${
    declaration.path
  }#:~:text=${encodeURIComponent(declaration.label)}`;
}

/**
 * Reports metrics to CI stats and logs validation results.
 *
 * This task:
 * - Reports metrics to CI stats reporter
 * - Logs validation results (any types, missing comments, missing exports)
 * - Displays tables of issues when stats flags are enabled
 * - Logs referenced deprecations and unused APIs when collecting references
 *
 * @param setupResult - Result from setup_project task.
 * @param apiMapResult - Result from build_api_map task.
 * @param allPluginStats - All collected plugin statistics.
 * @param log - Tooling log instance.
 * @param transaction - APM transaction for tracking.
 * @param options - CLI options including stats, collectReferences, and pluginFilter.
 */
export function reportMetrics(
  setupResult: SetupProjectResult,
  apiMapResult: BuildApiMapResult,
  allPluginStats: AllPluginStats,
  log: ToolingLog,
  transaction: Transaction,
  options: CliOptions
): void {
  const { plugins } = setupResult;
  const { missingApiItems, referencedDeprecations } = apiMapResult;
  const reporter = CiStatsReporter.fromEnv(log);

  const printIssueTable = (
    title: string,
    rows: Array<{ id: string; link: string; line?: number }>
  ) => {
    const count = rows.length;
    if (count === 0) {
      log.info(`${title}: none`);
      return;
    }
    log.info(`${title} (${count})`);
    // eslint-disable-next-line no-console
    console.table(rows);
  };

  const printMissingExportsTable = (
    title: string,
    entries: Array<{ source: string; references: string }>
  ) => {
    const header = title.toUpperCase();
    const count = entries.length;
    if (count === 0) {
      log.info(`${header}: none`);
      return;
    }
    log.info(`${header} (${count})`);
    // eslint-disable-next-line no-console
    console.table(
      entries.map(({ source, references }) => ({
        'Not exported source': source,
        references,
      }))
    );
  };

  for (const plugin of plugins) {
    // Note that the filtering is done here (per-plugin), rather than earlier in the pipeline.
    // This keeps the metrics task aligned with how other docs tasks process plugins and ensures
    // that all plugin data has been collected before selectively reporting metrics.
    if (options.pluginFilter && !options.pluginFilter.includes(plugin.id)) {
      continue;
    }

    const id = plugin.id;
    const pluginStats = allPluginStats[id];
    const pluginTeam = plugin.manifest.owner.name;

    const spanMetrics = transaction.startSpan(
      `build_api_docs.collectApiStatsForPlugin-${id}`,
      'stats'
    );

    reporter.metrics([
      {
        id,
        meta: { pluginTeam },
        group: 'Unreferenced deprecated APIs',
        value: referencedDeprecations[id] ? referencedDeprecations[id].length : 0,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'API count',
        value: pluginStats.apiCount,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'API count missing comments',
        value: pluginStats.missingComments.length,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'API count with any type',
        value: pluginStats.isAnyType.length,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'Non-exported public API item count',
        value: missingApiItems[id] ? Object.keys(missingApiItems[id]).length : 0,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'References to deprecated APIs',
        value: pluginStats.deprecatedAPIsReferencedCount,
      },
      {
        id,
        meta: {
          pluginTeam,
          // `meta` only allows primitives or string[]
          // Also, each string is allowed to have a max length of 2056,
          // so it's safer to stringify each element in the array over sending the entire array as stringified.
          // My internal tests with 4 plugins using the same API gets to a length of 156 chars,
          // so we should have enough room for tracking popular APIs.
          // TODO: We can do a follow-up improvement to split the report if we find out we might hit the limit.
          adoptionTrackedAPIs: pluginStats.adoptionTrackedAPIs.map((metric) =>
            JSON.stringify(metric)
          ),
        },
        group: 'Adoption-tracked APIs',
        value: pluginStats.adoptionTrackedAPIsCount,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'Adoption-tracked APIs that are not used anywhere',
        value: pluginStats.adoptionTrackedAPIsUnreferencedCount,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'ESLint disabled line counts',
        value: pluginStats.eslintDisableLineCount,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'ESLint disabled in files',
        value: pluginStats.eslintDisableFileCount,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'Total ESLint disabled count',
        value: pluginStats.eslintDisableFileCount + pluginStats.eslintDisableLineCount,
      },
      {
        id,
        meta: { pluginTeam },
        group: 'Enzyme imports',
        value: pluginStats.enzymeImportCount,
      },
    ]);

    if (options.collectReferences && options.pluginFilter?.includes(plugin.id)) {
      if (referencedDeprecations[id] && pluginStats.deprecatedAPIsReferencedCount > 0) {
        log.info(`${referencedDeprecations[id].length} deprecated APIs used`);
        // eslint-disable-next-line no-console
        console.table(referencedDeprecations[id]);
      } else {
        log.info(`No referenced deprecations for plugin ${plugin.id}`);
      }
      if (pluginStats.noReferences.length > 0) {
        // eslint-disable-next-line no-console
        console.table(
          pluginStats.noReferences.map((d) => ({
            id: d.id,
            link: getLink(d),
          }))
        );
      } else {
        log.info(`No unused APIs for plugin ${plugin.id}`);
      }
    }

    if (options.stats) {
      const passesAllChecks =
        pluginStats.isAnyType.length === 0 &&
        pluginStats.missingComments.length === 0 &&
        pluginStats.deprecatedAPIsReferencedCount === 0 &&
        (!missingApiItems[id] || Object.keys(missingApiItems[id]).length === 0);

      log.info(`--- Plugin '${id}' ${passesAllChecks ? 'passes all checks ----' : '----'}`);

      if (!passesAllChecks) {
        if (options.stats.includes('any')) {
          printIssueTable(
            'API items with ANY',
            pluginStats.isAnyType.map((d) => ({
              id: d.id,
              link: getLink(d),
            }))
          );
        }

        if (options.stats.includes('comments')) {
          printIssueTable(
            'API items missing comments',
            pluginStats.missingComments.map((d) => ({
              id: d.id,
              link: getLink(d),
            }))
          );
        }

        if (missingApiItems[id]) {
          if (options.stats.includes('exports')) {
            const exportsTable = Object.keys(missingApiItems[id]).map((key) => ({
              source: key,
              references: missingApiItems[id][key].join(', '),
            }));
            printMissingExportsTable('Referenced API items not exported', exportsTable);
          }
        }
      }
    }

    spanMetrics?.end();
  }
}
