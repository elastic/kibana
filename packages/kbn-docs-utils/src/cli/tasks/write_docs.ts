/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writePluginDocs } from '../../mdx/write_plugin_mdx_docs';
import { writeDeprecationDocByApi } from '../../mdx/write_deprecations_doc_by_api';
import { writeDeprecationDocByPlugin } from '../../mdx/write_deprecations_doc_by_plugin';
import { writePluginDirectoryDoc } from '../../mdx/write_plugin_directory_doc';
import { writeDeprecationDueByTeam } from '../../mdx/write_deprecations_due_by_team';
import { trimDeletedDocsFromNav } from '../../trim_deleted_docs_from_nav';
import type {
  AllPluginStats,
  BuildApiMapResult,
  CliContext,
  CliOptions,
  SetupProjectResult,
} from '../types';

/**
 * Writes all documentation files.
 *
 * This task:
 * - Writes plugin API documentation
 * - Writes deprecation documentation (by API, by plugin, by team)
 * - Writes plugin directory documentation
 * - Trims deleted docs from navigation
 *
 * @param context - CLI context with log, transaction, and output folder.
 * @param setupResult - Result from setup_project task.
 * @param apiMapResult - Result from build_api_map task.
 * @param allPluginStats - All collected plugin statistics.
 * @param options - CLI options including pluginFilter.
 */
export async function writeDocs(
  context: CliContext,
  setupResult: SetupProjectResult,
  apiMapResult: BuildApiMapResult,
  allPluginStats: AllPluginStats,
  options: CliOptions
): Promise<void> {
  const { log, transaction, outputFolder } = context;
  const { initialDocIds } = setupResult;
  const { plugins, allPlugins } = setupResult;
  const { pluginApiMap, referencedDeprecations, unreferencedDeprecations } = apiMapResult;

  // Only write aggregate docs (plugin directory, deprecation summaries) for full builds.
  // Filtered builds skip these because:
  // 1. Aggregate docs require complete data from all plugins to be accurate.
  // 2. Writing partial deprecation data would be misleading (e.g., "deprecation by team").
  // 3. Single-plugin builds focus on validating that plugin's docs only.
  const hasFilter = options.pluginFilter?.length || options.packageFilter?.length;
  if (!options.stats && !hasFilter) {
    const spanWritePluginDirectoryDoc = transaction.startSpan(
      'build_api_docs.writePluginDirectoryDoc',
      'write'
    );
    await writePluginDirectoryDoc(outputFolder, pluginApiMap, allPluginStats, log);
    spanWritePluginDirectoryDoc?.end();

    const spanWriteDeprecationDocByPlugin = transaction.startSpan(
      'build_api_docs.writeDeprecationDocByPlugin',
      'write'
    );
    await writeDeprecationDocByPlugin(outputFolder, referencedDeprecations, log);
    spanWriteDeprecationDocByPlugin?.end();

    const spanWriteDeprecationDueByTeam = transaction.startSpan(
      'build_api_docs.writeDeprecationDueByTeam',
      'write'
    );
    await writeDeprecationDueByTeam(outputFolder, referencedDeprecations, allPlugins, log);
    spanWriteDeprecationDueByTeam?.end();

    const spanWriteDeprecationDocByApi = transaction.startSpan(
      'build_api_docs.writeDeprecationDocByApi',
      'write'
    );
    await writeDeprecationDocByApi(
      outputFolder,
      referencedDeprecations,
      unreferencedDeprecations,
      log
    );
    spanWriteDeprecationDocByApi?.end();
  }

  for (const plugin of plugins) {
    if (options.pluginFilter && !options.pluginFilter.includes(plugin.id)) {
      continue;
    }

    const id = plugin.id;
    const pluginApi = pluginApiMap[id];
    const pluginStats = allPluginStats[id];

    if (!options.stats) {
      if (pluginStats.apiCount > 0) {
        log.info(`Writing public API doc for ${pluginApi.id}.`);

        const spanWritePluginDocs = transaction.startSpan(
          'build_api_docs.writePluginDocs',
          'write'
        );

        await writePluginDocs(outputFolder, { doc: pluginApi, plugin, pluginStats, log });

        spanWritePluginDocs?.end();
      } else {
        log.info(`${pluginApi.id} has no public API.`);
      }
    }
  }

  if (initialDocIds) {
    await trimDeletedDocsFromNav(log, initialDocIds, outputFolder);
  }
}
