/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ICommand, ICommandConfig } from './commands';
import { CliError } from './utils/errors';
import { log } from './utils/log';
import { buildProjectGraph } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';
import { Kibana } from './utils/kibana';

export async function runCommand(command: ICommand, config: Omit<ICommandConfig, 'kbn'>) {
  try {
    log.debug(`Running [${command.name}] command from [${config.rootPath}]`);

    const kbn = await Kibana.loadFrom(config.rootPath);
    const projects = kbn.getFilteredProjects({
      skipKibanaPlugins: Boolean(config.options['skip-kibana-plugins']),
      ossOnly: Boolean(config.options.oss),
      exclude: toArray(config.options.exclude),
      include: toArray(config.options.include),
    });

    if (projects.size === 0) {
      log.error(
        `There are no projects found. Double check project name(s) in '-i/--include' and '-e/--exclude' filters.`
      );
      return process.exit(1);
    }

    const projectGraph = buildProjectGraph(projects);

    log.debug(`Found ${projects.size.toString()} projects`);
    log.debug(renderProjectsTree(config.rootPath, projects));

    await command.run(projects, projectGraph, {
      ...config,
      kbn,
    });
  } catch (error) {
    log.error(`[${command.name}] failed:`);

    if (error instanceof CliError) {
      log.error(error.message);

      const metaOutput = Object.entries(error.meta)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      if (metaOutput) {
        log.info('Additional debugging info:\n');
        log.indent(2);
        log.info(metaOutput);
        log.indent(-2);
      }
    } else {
      log.error(error);
    }

    process.exit(1);
  }
}

function toArray<T>(value?: T | T[]) {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
