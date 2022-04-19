/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CiStatsReporter, CiStatsTiming } from '@kbn/ci-stats-reporter';

import { simpleKibanaPlatformPluginDiscovery, getPluginSearchPaths } from '@kbn/plugin-discovery';
import { ICommand, ICommandConfig } from './commands';
import { CliError } from './utils/errors';
import { log } from './utils/log';
import { buildProjectGraph } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';
import { regeneratePackageJson } from './utils/regenerate_package_json';
import { regenerateSyntheticPackageMap } from './utils/regenerate_synthetic_package_map';
import { regenerateBaseTsconfig } from './utils/regenerate_base_tsconfig';
import { Kibana } from './utils/kibana';

process.env.CI_STATS_NESTED_TIMING = 'true';

export async function runCommand(command: ICommand, config: Omit<ICommandConfig, 'kbn'>) {
  const runStartTime = Date.now();
  let kbn: undefined | Kibana;
  const timings: Array<Omit<CiStatsTiming, 'group'>> = [];
  async function time<T>(id: string, block: () => Promise<T>): Promise<T> {
    const start = Date.now();
    let success = true;
    try {
      return await block();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      timings.push({
        id,
        ms: Date.now() - start,
        meta: {
          success,
        },
      });
    }
  }

  async function reportTimes(timingConfig: { group: string; id: string }, error?: Error) {
    if (!kbn) {
      // things are too broken to report remotely
      return;
    }

    const reporter = CiStatsReporter.fromEnv(log);

    try {
      await reporter.timings({
        upstreamBranch: kbn.kibanaProject.json.branch,
        // prevent loading @kbn/utils by passing null
        kibanaUuid: kbn.getUuid() || null,
        timings: [
          ...timings.map((t) => ({ ...timingConfig, ...t })),
          {
            group: timingConfig.group,
            id: timingConfig.id,
            ms: Date.now() - runStartTime,
            meta: {
              success: !error,
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

  try {
    log.debug(`Running [${command.name}] command from [${config.rootPath}]`);

    await time('regenerate package.json, synthetic-package map and tsconfig', async () => {
      const plugins = simpleKibanaPlatformPluginDiscovery(
        getPluginSearchPaths({
          rootDir: config.rootPath,
          oss: false,
          examples: true,
          testPlugins: true,
        }),
        []
      );

      await Promise.all([
        regeneratePackageJson(config.rootPath),
        regenerateSyntheticPackageMap(plugins, config.rootPath),
        regenerateBaseTsconfig(plugins, config.rootPath),
      ]);
    });

    kbn = await time('load Kibana project', async () => await Kibana.loadFrom(config.rootPath));
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
      await reportTimes(command.reportTiming);
    }
  } catch (error) {
    if (command.reportTiming) {
      await reportTimes(command.reportTiming, error);
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
