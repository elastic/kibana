/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CiStatsReporter } from '@kbn/dev-utils/ci_stats_reporter';

import { ICommand, ICommandConfig } from './commands';
import { CliError } from './utils/errors';
import { log } from './utils/log';
import { buildProjectGraph } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';
import { Kibana } from './utils/kibana';

process.env.CI_STATS_NESTED_TIMING = 'true';

export async function runCommand(command: ICommand, config: Omit<ICommandConfig, 'kbn'>) {
  const runStartTime = Date.now();
  let kbn;

  try {
    log.debug(`Running [${command.name}] command from [${config.rootPath}]`);

    kbn = await Kibana.loadFrom(config.rootPath);
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

    if (command.reportTiming) {
      const reporter = CiStatsReporter.fromEnv(log);
      await reporter.timings({
        upstreamBranch: kbn.kibanaProject.json.branch,
        // prevent loading @kbn/utils by passing null
        kibanaUuid: kbn.getUuid() || null,
        timings: [
          {
            group: command.reportTiming.group,
            id: command.reportTiming.id,
            ms: Date.now() - runStartTime,
            meta: {
              success: true,
            },
          },
        ],
      });
    }
  } catch (error) {
    if (command.reportTiming) {
      // if we don't have a kbn object then things are too broken to report on
      if (kbn) {
        try {
          const reporter = CiStatsReporter.fromEnv(log);
          await reporter.timings({
            upstreamBranch: kbn.kibanaProject.json.branch,
            // prevent loading @kbn/utils by passing null
            kibanaUuid: kbn.getUuid() || null,
            timings: [
              {
                group: command.reportTiming.group,
                id: command.reportTiming.id,
                ms: Date.now() - runStartTime,
                meta: {
                  success: false,
                },
              },
            ],
          });
        } catch (e) {
          // prevent hiding bootstrap errors
          log.error('failed to report timings:');
          log.error(e);
        }
      }
    }

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
