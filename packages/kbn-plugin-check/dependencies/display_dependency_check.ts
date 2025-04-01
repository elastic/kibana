/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginOrPackage } from '@kbn/docs-utils/src/types';
import { ToolingLog } from '@kbn/tooling-log';
import { Project } from 'ts-morph';
import { inspect } from 'util';
import { createTable } from './create_table';
import { getDependencySummary } from './get_dependency_summary';
import { getPluginInfo } from './get_plugin_info';

/**
 * Prepare and output information about a plugin's dependencies.
 */
export const displayDependencyCheck = (
  project: Project,
  plugin: PluginOrPackage,
  log: ToolingLog
) => {
  log.info('Running plugin check on plugin:', plugin.id);
  log.indent(4);

  const pluginInfo = getPluginInfo(project, plugin, log);

  if (!pluginInfo) {
    log.error(`Cannot find dependencies for plugin ${plugin.id}`);
    return;
  }

  log.debug('Building dependency summary...');

  const summary = getDependencySummary(pluginInfo, log);

  log.debug(inspect(summary, true, null, true));

  const table = createTable(pluginInfo, summary, log);

  log.indent(-4);
  log.info(table.toString());
};
