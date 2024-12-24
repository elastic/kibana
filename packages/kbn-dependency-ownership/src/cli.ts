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

import { identifyDependencyOwnership } from './dependency_ownership';

interface CLIArgs {
  dependency?: string;
  owner?: string;
  missingOwner?: boolean;
  outputPath?: string;
}

export const configureYargs = () => {
  return yargs(process.argv.slice(2))
    .command(
      '*',
      chalk.green('Identify the dependency ownership'),
      (y) => {
        y.version(false)
          .option('dependency', {
            alias: 'd',
            describe: chalk.yellow('Show who owns the given dependency'),
            type: 'string',
          })
          .option('owner', {
            alias: 'o',
            type: 'string',
            describe: chalk.magenta('Show dependencies owned by the given owner'),
          })
          .option('missing-owner', {
            describe: chalk.cyan('Show dependencies that are not owned by any team'),
            type: 'boolean',
          })
          .option('output-path', {
            alias: 'f',
            describe: chalk.blue('Specify the output file to save results as JSON'),
            type: 'string',
          })
          .check(({ dependency, owner, missingOwner }: Partial<CLIArgs>) => {
            const notProvided = [dependency, owner, missingOwner].filter(
              (arg) => arg === undefined
            );

            if (notProvided.length === 1) {
              throw new Error(
                'You must provide either a dependency, owner, or missingOwner flag to search for'
              );
            }

            return true;
          })
          .example(
            '--owner @elastic/kibana-core',
            chalk.blue('Searches for all dependencies owned by the Kibana Core team')
          );
      },
      async (argv: CLIArgs) => {
        const { dependency, owner, missingOwner, outputPath } = argv;

        if (owner) {
          console.log(chalk.yellow(`Searching for dependencies owned by ${owner}...\n`));
        }

        try {
          const result = identifyDependencyOwnership({ dependency, owner, missingOwner });

          if (outputPath) {
            const isJsonFile = nodePath.extname(outputPath) === '.json';
            const outputFile = isJsonFile
              ? outputPath
              : nodePath.join(outputPath, 'dependency-ownership.json');

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
          console.error('Error fetching dependency ownership:', error.message);
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
