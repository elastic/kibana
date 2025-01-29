/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { findAndRelocateModules, findAndMoveModule } from './relocate';
import { listModules } from './list';
import { findBrokenLinks, findBrokenReferences } from './healthcheck';

const toStringArray = (flag: string | boolean | string[] | undefined): string[] => {
  if (typeof flag === 'string') {
    return [flag].filter(Boolean);
  } else if (typeof flag === 'boolean') {
    return [];
  } else if (Array.isArray(flag)) {
    return flag.filter(Boolean);
  }
  return [];
};

const toOptString = (
  flagName: string,
  flag: string | boolean | string[] | undefined,
  defaultValue?: string
): string | undefined => {
  if (typeof flag === 'boolean') {
    throw Error(`You must specify a valid string for the --${flagName} flag`);
  } else if (Array.isArray(flag)) {
    throw Error(`Cannot specify multiple values for --${flagName} flag`);
  }
  return flag || defaultValue;
};

/**
 * A CLI to move Kibana modules into the right folder structure,
 * according to the Sustainable Kibana Architecture
 */
export const runKbnRelocateCli = () => {
  run(
    async ({ log, flags }) => {
      if (typeof flags.list === 'string' && flags.list.length > 0) {
        await listModules(flags.list, log);
      } else if (typeof flags.healthcheck === 'string' && flags.healthcheck.length > 0) {
        if (flags.healthcheck === 'references') {
          await findBrokenReferences(log);
        } else if (flags.healthcheck === 'links') {
          await findBrokenLinks(log);
        } else {
          log.error(`Unknown --healthcheck option: ${flags.healthcheck}`);
        }
      } else if (typeof flags.moveOnly === 'string' && flags.moveOnly.length > 0) {
        log.info('When using --moveOnly flag, the rest of flags are ignored.');
        await findAndMoveModule(flags.moveOnly, log);
      } else {
        const { pr, team, path, include, exclude, baseBranch } = flags;
        await findAndRelocateModules(
          {
            prNumber: toOptString('prNumber', pr),
            baseBranch: toOptString('baseBranch', baseBranch, 'main')!,
            teams: toStringArray(team),
            paths: toStringArray(path),
            included: toStringArray(include),
            excluded: toStringArray(exclude),
          },
          log
        );
      }
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: [
          'healthcheck',
          'pr',
          'team',
          'path',
          'include',
          'exclude',
          'baseBranch',
          'moveOnly',
          'list',
        ],
        help: `
          Usage: node scripts/relocate [options]

          --list "all" List all Kibana modules
          --list "uncategorised" List Kibana modules that are lacking 'group' or 'visibility' information
          --list "incorrect" List Kibana modules that are not in the correct folder (aka folder does not match group/visibility in the manifest)
          --healthcheck "references" Find broken references in Kibana codebase (Beta)
          --healthcheck "links" Find broken links in Kibana codebase (Beta)
          --moveOnly <moduleId> Only move the specified module in the current branch (no cleanup, no branching, no commit)
          --pr <number> Use the given PR number instead of creating a new one
          --team <owner> Include all modules (packages and plugins) belonging to the specified owner (can specify multiple teams)
          --path <path> Include all modules (packages and plugins) under the specified path (can specify multiple paths)
          --include <id> Include the specified module in the relocation (can specify multiple modules)
          --exclude <id> Exclude the specified module from the relocation (can use multiple times)
          --baseBranch <name> Use a branch different than 'main' (e.g. "8.x")

          E.g. relocate all modules owned by Core team and also modules owned by Operations team, excluding 'foo-module-id'. Force push into PR 239847:
          node scripts/relocate --pr 239847 --team @elastic/kibana-core --team @elastic/kibana-operations --exclude @kbn/foo-module-id
        `,
      },
    }
  );
};
