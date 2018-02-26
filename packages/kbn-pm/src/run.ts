import chalk from 'chalk';
import wrapAnsi from 'wrap-ansi';
import indentString from 'indent-string';
import { schema } from '@kbn/utils';

import { CliError } from './utils/errors';
import { getProjects, buildProjectGraph } from './utils/projects';
import { renderProjectsTree } from './utils/projects_tree';
import {
  getProjectPaths,
  projectPathsFields,
  ProjectPathOptions,
} from './config';
import {
  Command,
  CommandSchema,
  AdditionalOptionsSchemas,
  ValidatedOptions,
} from './commands/command';
import { entries } from './utils/entries';

type RunCommandConfig = {
  options: { [key: string]: any };
  extraArgs: string[];
  rootPath: string;
};

export async function runCommand<T extends CommandSchema>(
  command: Command<T>,
  config: RunCommandConfig
) {
  try {
    console.log(
      chalk.bold(
        `Running [${chalk.green(command.name)}] command from [${chalk.yellow(
          config.rootPath
        )}]:\n`
      )
    );

    const { additionalOptions } = command;

    let additionalFields = {} as AdditionalOptionsSchemas<T>;

    if (additionalOptions !== undefined) {
      for (const [name, options] of entries(additionalOptions)) {
        additionalFields[name] = options.schema;
      }
    }

    const finalSchema = schema.object(
      Object.assign({}, projectPathsFields, additionalFields)
    );

    const options = finalSchema.validate(config.options) as ProjectPathOptions &
      ValidatedOptions<T>;

    const projectPaths = getProjectPaths(config.rootPath, options);
    const projects = await getProjects(config.rootPath, projectPaths);
    const projectGraph = buildProjectGraph(projects);

    console.log(
      chalk.bold(`Found [${chalk.green(projects.size.toString())}] projects:\n`)
    );
    console.log(renderProjectsTree(config.rootPath, projects));

    await command.run({
      projects,
      projectGraph,
      rootPath: config.rootPath,
      extraArgs: config.extraArgs,
      options,
    });
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
