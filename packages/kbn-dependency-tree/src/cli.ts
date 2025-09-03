/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { buildDependencyTree, printTree, printJson } from './dependency_tree';

const DEFAULT_MAX_DEPTH = 3;

export function runCli() {
  run(
    async ({ log, flags }) => {
      const tsconfigPath = flags._?.[0];
      if (!tsconfigPath || typeof tsconfigPath !== 'string') {
        throw createFlagError('Please provide a tsconfig.json file path as the first argument');
      }

      const maxDepth = typeof flags.depth === 'number' ? flags.depth : DEFAULT_MAX_DEPTH;

      const filter = typeof flags.filter === 'string' ? flags.filter : undefined;

      const showPaths = !!flags.paths;
      const jsonOutput = !!flags.json;

      const treeOptions = {
        maxDepth,
        filter,
      };

      if (!jsonOutput) {
        log.info(`@kbn dependency tree for ${tsconfigPath}`);
        if (filter) {
          log.info(`(filtered to packages containing: "${filter}")`);
        }
        log.info('');
      }

      const tree = buildDependencyTree(tsconfigPath, treeOptions);

      if (jsonOutput) {
        printJson(tree);
      } else {
        if (tree) {
          printTree(tree, '', true, showPaths);
        } else {
          log.info('No dependencies found or unable to build dependency tree.');
        }

        log.info('');
        log.info('Legend:');
        log.info('  [EXTERNAL]     - Package not found in root package.json dependencies');
        log.info('  [CIRCULAR]     - Circular dependency detected');
        log.info('  [NO-TSCONFIG]  - Package found but no tsconfig.json');

        if (filter) {
          log.info(`  Filtered to packages containing: "${filter}"`);
        }
      }
    },
    {
      description:
        'CLI dependency tree visualization using tsconfig.json files with kbn_references',
      usage: 'node scripts/kbn_dependency_tree <tsconfig.json> [options]',
      flags: {
        boolean: ['paths', 'json'],
        string: ['filter'],
        number: ['depth'],
        default: {
          depth: DEFAULT_MAX_DEPTH,
        },
        help: `
Examples:
  node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json
  node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --depth 2
  node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --filter "@kbn/ml-"

Options:
  --depth <n>      Maximum depth to traverse (default: ${DEFAULT_MAX_DEPTH})
  --paths          Show package paths in parentheses
  --filter <pattern>  Show only dependencies matching pattern (e.g., "@kbn/ml-", "core")
  --json           Output as JSON
        `,
      },
    }
  );
}
