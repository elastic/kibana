/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run, type FlagOptions } from '@kbn/dev-cli-runner';
import { checkDependencies } from './dependencies';
import { rankDependencies } from './rank';
import { findDependents } from './dependents';
import { dotDependencies } from './dot';

const flagOptions: FlagOptions = {
  boolean: ['dot', 'rank'],
  string: ['dependencies', 'dependents'],
  help: `
          --rank                   Display plugins as a ranked list of usage.
          --dependents [plugin]    Display plugins that depend on a given plugin.
          --dependencies [plugin]  Check plugin dependencies for a single plugin.
          --dependencies [team]    Check dependencies for all plugins owned by a team.
          --dot                    Output a graphviz dot file of plugin dependencies.
        `,
};

/**
 * A CLI for checking the consistency of a plugin's declared and implicit dependencies.
 */
export const runPluginCheckCli = () => {
  run(
    async ({ log, flags }) => {
      const availableFlags = [...(flagOptions.boolean ?? []), ...(flagOptions.string ?? [])];
      const setFlags = availableFlags.filter((flag) => flags[flag]);

      if (setFlags.length > 1) {
        const lastFlag = availableFlags.pop();
        const flagList = availableFlags.join(', --');
        throw new Error(
          `Only one of --${flagList}${
            availableFlags.length > 1 ? ', or --' : ' or --'
          }${lastFlag} may be specified.`
        );
      }

      if (flags.dependencies) {
        checkDependencies(flags, log);
      }

      if (flags.dot) {
        dotDependencies(log);
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
      flags: flagOptions,
    }
  );
};
