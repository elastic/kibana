import chalk from 'chalk';
import indentString from 'indent-string';
import wrapAnsi from 'wrap-ansi';

import { Command, CommandConfig } from './commands';
import { getProjectPaths, ProjectPathOptions } from './config';
import { CliError } from './utils/errors';
import { buildProjectGraph, getProjects } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';

export async function runCommand(command: Command, config: CommandConfig) {
  try {
    /* tslint:disable-next-line no-console */
    console.log(
      chalk.bold(
        `Running [${chalk.green(command.name)}] command from [${chalk.yellow(
          config.rootPath
        )}]:\n`
      )
    );

    const projectPaths = getProjectPaths(
      config.rootPath,
      config.options as ProjectPathOptions
    );

    const projects = await getProjects(config.rootPath, projectPaths, {
      exclude: toArray(config.options.exclude),
      include: toArray(config.options.include),
    });

    if (projects.size === 0) {
      /* tslint:disable-next-line no-console */
      console.log(
        chalk.red(
          `There are no projects found. Double check project name(s) in '-i/--include' and '-e/--exclude' filters.\n`
        )
      );
      return process.exit(1);
    }

    const projectGraph = buildProjectGraph(projects);

    /* tslint:disable-next-line no-console */
    console.log(
      chalk.bold(`Found [${chalk.green(projects.size.toString())}] projects:\n`)
    );
    /* tslint:disable-next-line no-console */
    console.log(renderProjectsTree(config.rootPath, projects));

    await command.run(projects, projectGraph, config);
  } catch (e) {
    /* tslint:disable-next-line no-console */
    console.log(chalk.bold.red(`\n[${command.name}] failed:\n`));

    if (e instanceof CliError) {
      const msg = chalk.red(`CliError: ${e.message}\n`);
      /* tslint:disable-next-line no-console */
      console.log(wrapAnsi(msg, 80));

      const keys = Object.keys(e.meta);
      if (keys.length > 0) {
        const metaOutput = keys.map(key => {
          const value = e.meta[key];
          return `${key}: ${value}`;
        });

        /* tslint:disable-next-line no-console */
        console.log('Additional debugging info:\n');
        /* tslint:disable-next-line no-console */
        console.log(indentString(metaOutput.join('\n'), 3));
      }
    } else {
      /* tslint:disable-next-line no-console */
      console.log(e.stack);
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
