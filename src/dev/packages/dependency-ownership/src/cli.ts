/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import nodePath from 'path';

import fs from 'fs';

import { DependenciesByOwner, identifyDependencyOwnership } from './dependency_ownership';

interface CLIArgs {
  dependency?: string;
  owner?: string;
  missingOwner?: boolean;
  outputPath?: string;
  failIfUnowned?: boolean;
}

export async function identifyDependencyOwnershipCLI() {
  await run(
    async ({ log, flags }) => {
      // Check if flags are valid
      const { dependency, owner, missingOwner, outputPath, failIfUnowned } = flags as CLIArgs;
      if (!dependency && !owner && !missingOwner) {
        throw createFailError(
          'You must provide either a dependency, owner, or missingOwner flag. Use --help for more information.'
        );
      }

      if (failIfUnowned && !missingOwner) {
        throw createFailError(
          'You must provide the missingOwner flag to use the failIfUnowned flag'
        );
      }

      if (owner) {
        log.write(`Searching for dependencies owned by ${owner}...\n`);
      }

      const result = identifyDependencyOwnership({ dependency, owner, missingOwner });
      if (failIfUnowned) {
        const { prodDependencies = [] as string[], devDependencies = [] as string[] } =
          result as DependenciesByOwner;

        const uncoveredDependencies = [...prodDependencies, ...devDependencies];
        if (uncoveredDependencies.length > 0) {
          log.write('Dependencies without an owner:');
          log.write(uncoveredDependencies.map((dep) => ` - ${dep}`).join('\n'));
          throw createFailError(
            `Found ${uncoveredDependencies.length} dependencies without an owner. Please update \`renovate.json\` to include these dependencies.\nVisit https://docs.elastic.dev/kibana-dev-docs/third-party-dependencies#dependency-ownership for more information.`
          );
        } else {
          log.success('All dependencies have an owner');
        }
      }

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
            throw createFailError(`Failed to save results to ${outputFile}: ${err.message}`);
          } else {
            log.success(`Results successfully saved to ${outputFile}`);
          }
        });
      } else {
        log.debug('No output file specified, displaying results below:');
        log.success(JSON.stringify(result, null, 2));
      }
    },
    {
      description: `A CLI tool for analyzing package ownership.`,
      usage: 'node scripts/dependency_ownership --dependency <dependency>',
      flags: {
        string: ['dependency', 'owner', 'outputPath'],
        boolean: ['missingOwner', 'failIfUnowned'],
        alias: {
          d: 'dependency',
          o: 'owner',
          f: 'outputPath',
        },
        help: `
        --dependency, -d   Show who owns the given dependency
        --owner, -o        Show dependencies owned by the given owner
        --missingOwner     Show dependencies that are not owned by any team
        --outputPath, -f   Specify the output file to save results as JSON
        --failIfUnowned    Fail if any dependencies are not owned by any team
      `,
      },
    }
  );
}

export const runCLI = () => {
  identifyDependencyOwnershipCLI();
};

if (!process.env.JEST_WORKER_ID) {
  runCLI();
}
