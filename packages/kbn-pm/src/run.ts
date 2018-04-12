import chalk from 'chalk';
import wrapAnsi from 'wrap-ansi';
import indentString from 'indent-string';

import { CliError } from './utils/errors';
import { getProjects, buildProjectGraph } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';
import { getProjectPaths, ProjectPathOptions } from './config';
import { Command, CommandConfig } from './commands';

export async function runCommand(command: Command, config: CommandConfig) {
  try {
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
      console.log(
        chalk.red(
          `There are no projects found. Double check project name(s) in '-i/--include' and '-e/--exclude' filters.\n`
        )
      );
      return process.exit(1);
    }

    const projectGraph = buildProjectGraph(projects);

    console.log(
      chalk.bold(`Found [${chalk.green(projects.size.toString())}] projects:\n`)
    );
    console.log(renderProjectsTree(config.rootPath, projects));

    await command.run(projects, projectGraph, config);
  } catch (e) {
    console.log(chalk.bold.red(`\n[${command.name}] failed:\n`));

    if (e instanceof CliError) {
      const msg = chalk.red(`CliError: ${e.message}\n`);
      console.log(wrapAnsi(msg, 80));

      const keys = Object.keys(e.meta);
      if (keys.length > 0) {
        const metaOutput = keys.map(key => {
          const value = e.meta[key];
          return `${key}: ${value}`;
        });

        console.log('Additional debugging info:\n');
        console.log(indentString(metaOutput.join('\n'), 3));
      }
    } else {
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
