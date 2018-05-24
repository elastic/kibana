import chalk from 'chalk';
import indentString from 'indent-string';
import wrapAnsi from 'wrap-ansi';

import { ICommand, ICommandConfig } from './commands';
import { getProjectPaths, IProjectPathOptions } from './config';
import { CliError } from './utils/errors';
import { log } from './utils/log';
import { buildProjectGraph, getProjects } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';

export async function runCommand(command: ICommand, config: ICommandConfig) {
  try {
    log.write(
      chalk.bold(
        `Running [${chalk.green(command.name)}] command from [${chalk.yellow(
          config.rootPath
        )}]:\n`
      )
    );

    const projectPaths = getProjectPaths(
      config.rootPath,
      config.options as IProjectPathOptions
    );

    const projects = await getProjects(config.rootPath, projectPaths, {
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

    log.write(
      chalk.bold(`Found [${chalk.green(projects.size.toString())}] projects:\n`)
    );
    log.write(renderProjectsTree(config.rootPath, projects));

    await command.run(projects, projectGraph, config);
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
