/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import chalk from 'chalk';
import indentString from 'indent-string';
import wrapAnsi from 'wrap-ansi';

import { ICommand, ICommandConfig } from './commands';
import { CliError } from './utils/errors';
import { log } from './utils/log';
import { buildProjectGraph } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';
import { Kibana } from './utils/kibana';

export async function runCommand(command: ICommand, config: Omit<ICommandConfig, 'kbn'>) {
  try {
    log.write(
      chalk.bold(
        `Running [${chalk.green(command.name)}] command from [${chalk.yellow(config.rootPath)}]:\n`
      )
    );

    const kbn = await Kibana.loadFrom(config.rootPath);
    const projects = kbn.getFilteredProjects({
      skipKibanaPlugins: Boolean(config.options['skip-kibana-plugins']),
      ossOnly: Boolean(config.options.oss),
      exclude: toArray(config.options.exclude),
      include: toArray(config.options.include),
    });

    if (projects.size === 0) {
      log.write(
        chalk.red(
          `There are no projects found. Double check project name(s) in '-i/--include' and '-e/--exclude' filters.\n`
        )
      );
      return process.exit(1);
    }

    const projectGraph = buildProjectGraph(projects);

    log.write(chalk.bold(`Found [${chalk.green(projects.size.toString())}] projects:\n`));
    log.write(renderProjectsTree(config.rootPath, projects));

    await command.run(projects, projectGraph, {
      ...config,
      kbn,
    });
  } catch (e) {
    log.write(chalk.bold.red(`\n[${command.name}] failed:\n`));

    if (e instanceof CliError) {
      const msg = chalk.red(`CliError: ${e.message}\n`);
      log.write(wrapAnsi(msg, 80));

      const keys = Object.keys(e.meta);
      if (keys.length > 0) {
        const metaOutput = keys.map(key => {
          const value = e.meta[key];
          return `${key}: ${value}`;
        });

        log.write('Additional debugging info:\n');
        log.write(indentString(metaOutput.join('\n'), 3));
      }
    } else {
      log.write(e.stack);
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
