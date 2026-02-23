/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transaction } from 'elastic-apm-node';
import type { Project } from 'ts-morph';
import type { ToolingLog } from '@kbn/tooling-log';
import { getPluginApiMap } from '../../get_plugin_api_map';
import type { PluginOrPackage } from '../../types';
import type { BuildApiMapResult, CliOptions } from '../types';

/**
 * Builds the plugin API map by analyzing TypeScript code.
 *
 * This task:
 * - Analyzes TypeScript source files using the project
 * - Extracts API declarations from plugins
 * - Collects missing API items, deprecations, and adoption-tracked APIs
 * - Optionally collects references between APIs
 *
 * @param project - TypeScript project instance.
 * @param plugins - List of plugins and packages to analyze.
 * @param log - Tooling log instance.
 * @param transaction - APM transaction for tracking.
 * @param options - CLI options including collectReferences and pluginFilter.
 * @returns Built API map with all collected metadata.
 */
export function buildApiMap(
  project: Project,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  transaction: Transaction,
  options: CliOptions
): BuildApiMapResult {
  const spanPluginApiMap = transaction.startSpan('build_api_docs.getPluginApiMap', 'setup');

  const {
    pluginApiMap,
    missingApiItems,
    unreferencedDeprecations,
    referencedDeprecations,
    adoptionTrackedAPIs,
  } = getPluginApiMap(project, plugins, log, {
    collectReferences: options.collectReferences,
    pluginFilter: options.pluginFilter,
  });

  spanPluginApiMap?.end();

  return {
    pluginApiMap,
    missingApiItems,
    referencedDeprecations,
    unreferencedDeprecations,
    adoptionTrackedAPIs,
  };
}
