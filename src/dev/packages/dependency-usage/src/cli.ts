/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import nodePath from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import fs from 'fs';

import { identifyDependencyUsageWithCruiser } from './dependency_graph/providers/cruiser.ts';

interface CLIArgs {
  dependencyName?: string;
  paths: string[];
  groupBy: string;
  summary: boolean;
  outputPath: string;
  collapseDepth: number;
  tool: string;
  verbose: boolean;
}

export const configureYargs = () => {
  return yargs(process.argv.slice(2))
    .command(
      '*',
      chalk.green('Identify the usage of a dependency in the given paths and output as JSON'),
      (y) => {
        y.version(false)
          .option('dependency-name', {
            alias: 'd',
            describe: chalk.yellow('The name of the dependency to search for'),
            type: 'string',
            demandOption: false,
          })
          .option('paths', {
            alias: 'p',
            describe: chalk.cyan('The paths to search within (can be multiple)'),
            type: 'string',
            array: true,
            default: ['.'],
          })
          .option('group-by', {
            alias: 'g',
            describe: chalk.magenta('Group results by either owner or source (package/plugin)'),
            choices: ['owner', 'source'],
          })
          .option('summary', {
            alias: 's',
            describe: chalk.magenta(
              'Output a summary instead of full details. Applies only when a dependency name is provided'
            ),
            type: 'boolean',
          })
          .option('collapse-depth', {
            alias: 'c',
            describe: chalk.blue('Specify the directory depth level for collapsing'),
            type: 'number',
            default: 1,
          })
          .option('output-path', {
            alias: 'o',
            describe: chalk.blue('Specify the output file to save results as JSON'),
            type: 'string',
          })
          .option('verbose', {
            alias: 'v',
            describe: chalk.blue('Outputs verbose graph details to a file'),
            type: 'boolean',
            default: false,
          })
          .check(({ summary, dependencyName, collapseDepth }: Partial<CLIArgs>) => {
            if (summary && !dependencyName) {
              throw new Error('Summary option can only be used when a dependency name is provided');
            }

            if (collapseDepth !== undefined && collapseDepth <= 0) {
              throw new Error('Collapse depth must be a positive integer');
            }

            return true;
          })
          .example(
            '--dependency-name lodash --paths ./src ./lib',
            chalk.blue(
              'Searches for "lodash" usage in the ./src and ./lib directories and outputs as JSON'
            )
          );
      },
      async (argv: CLIArgs) => {
        const {
          dependencyName,
          paths,
          groupBy,
          summary,
          collapseDepth,
          outputPath,
          verbose: isVerbose,
        } = argv;
        if (dependencyName) {
          console.log(
            `Searching for dependency ${chalk.bold.magenta(
              dependencyName
            )} in paths: ${chalk.bold.magenta(paths.join(', '))}`
          );
        } else {
          console.log(
            `Searching for dependencies in paths: ${chalk.bold.magenta(paths.join(', '))}`
          );
        }

        if (collapseDepth > 1) {
          console.log(`Dependencies will be collapsed to depth: ${chalk.bold.blue(collapseDepth)}`);
        }

        try {
          console.log(`${chalk.bold.magenta('cruiser')} is used for building dependency graph`);

          const result = await identifyDependencyUsageWithCruiser(paths, dependencyName, {
            groupBy,
            summary,
            collapseDepth,
            isVerbose,
          });

          if (outputPath) {
            const isJsonFile = nodePath.extname(outputPath) === '.json';
            const outputFile = isJsonFile
              ? outputPath
              : nodePath.join(outputPath, 'dependency-usage.json');

            const outputDir = nodePath.dirname(outputFile);

            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFile(outputFile, JSON.stringify(result, null, 2), (err) => {
              if (err) {
                console.error(chalk.red(`Failed to save results to ${outputFile}: ${err.message}`));
              } else {
                console.log(chalk.green(`Results successfully saved to ${outputFile}`));
              }
            });
          } else {
            console.log(chalk.yellow('No output file specified, displaying results below:\n'));
            console.log(JSON.stringify(result, null, 2));
          }
        } catch (error) {
          console.error('Error fetching dependency usage:', error.message);
        }
      }
    )
    .help();
};

export const runCLI = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  configureYargs().argv;
};

if (!process.env.JEST_WORKER_ID) {
  runCLI();
}
