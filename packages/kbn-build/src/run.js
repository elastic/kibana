import chalk from 'chalk';
import wrapAnsi from 'wrap-ansi';
import indentString from 'indent-string';

import { CliError } from './utils/errors';
import { getProjects, buildProjectGraph } from './utils/projects';
import { getProjectPaths } from './config';

export async function runCommand(command, config) {
  try {
    console.log(
      chalk.bold(
        `Running [${chalk.green(command.name)}] command from [${chalk.yellow(
          config.rootPath
        )}]:\n`
      )
    );

    const projectPaths = getProjectPaths(config.rootPath, config.options);

    const projects = await getProjects(config.rootPath, projectPaths);
    const projectGraph = buildProjectGraph(projects);

    console.log(
      chalk.bold(`Found [${chalk.green(projects.size)}] projects:\n`)
    );
    for (const pkg of projects.values()) {
      console.log(`- ${pkg.name} (${pkg.path})`);
    }

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
