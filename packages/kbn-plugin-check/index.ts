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
        if ((!flags.plugin && !flags.team) || (flags.plugin && flags.team)) {
          throw new Error(
            'Either --plugin or --team must or may be specified when checking dependencies.'
          );
        }

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
        boolean: ['dependencies', 'rank'],
        string: ['plugin', 'team', 'dependents'],
        help: `
          --rank                  Display plugins as a ranked list of usage.
          --dependents [plugin]   Display plugins that depend on a given plugin.
          --dependencies          Check plugin dependencies.
            --plugin [plugin]       The plugin to check.
            --team [team]           Check all plugins owned by a given team.
        `,
      },
    }
  );
};
