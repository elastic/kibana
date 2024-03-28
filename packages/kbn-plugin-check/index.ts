/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { checkDependencies } from './dependencies';
import { rankDependencies } from './rank';
import { findDependents } from './dependents';

/**
 * A CLI for checking the consistency of a plugin's declared and implicit dependencies.
 */
export const runPluginCheckCli = () => {
  run(
    async ({ log, flags }) => {
      if (
        (flags.dependencies && flags.rank) ||
        (flags.dependencies && flags.dependents) ||
        (flags.rank && flags.dependents)
      ) {
        throw new Error('Only one of --dependencies, --rank, or --dependents may be specified.');
      }

      if (flags.dependencies) {
        checkDependencies(flags, log);
      }

      if (flags.rank) {
        rankDependencies(log);
      }

      if (flags.dependents && typeof flags.dependents === 'string') {
        findDependents(flags.dependents, log);
      }
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        boolean: ['rank'],
        string: ['dependencies', 'dependents'],
        help: `
          --rank                   Display plugins as a ranked list of usage.
          --dependents [plugin]    Display plugins that depend on a given plugin.
          --dependencies [plugin]  Check plugin dependencies for a single plugin.
          --dependencies [team]    Check dependencies for all plugins owned by a team.
        `,
      },
    }
  );
};
