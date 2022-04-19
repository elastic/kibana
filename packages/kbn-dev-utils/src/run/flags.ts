/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import getopts from 'getopts';

import { LOG_LEVEL_FLAGS, DEFAULT_LOG_LEVEL } from '@kbn/tooling-log';
import { RunOptions } from './run';

export interface Flags {
  verbose: boolean;
  quiet: boolean;
  silent: boolean;
  debug: boolean;
  help: boolean;
  _: string[];
  unexpected: string[];

  [key: string]: undefined | boolean | string | string[];
}

export interface FlagOptions {
  allowUnexpected?: boolean;
  guessTypesForUnexpectedFlags?: boolean;
  help?: string;
  alias?: { [key: string]: string | string[] };
  boolean?: string[];
  string?: string[];
  default?: { [key: string]: any };
}

export function mergeFlagOptions(global: FlagOptions = {}, local: FlagOptions = {}): FlagOptions {
  return {
    alias: {
      ...global.alias,
      ...local.alias,
    },
    boolean: [...(global.boolean || []), ...(local.boolean || [])],
    string: [...(global.string || []), ...(local.string || [])],
    default: {
      ...global.default,
      ...local.default,
    },

    help: local.help,

    allowUnexpected: !!(global.allowUnexpected || local.allowUnexpected),
    guessTypesForUnexpectedFlags: !!(global.allowUnexpected || local.allowUnexpected),
  };
}

export function getFlags(
  argv: string[],
  flagOptions: RunOptions['flags'] = {},
  defaultLogLevel: string = DEFAULT_LOG_LEVEL
): Flags {
  const unexpectedNames = new Set<string>();

  const logLevelFlags = LOG_LEVEL_FLAGS.map((f) => f.name).filter((f) => f !== defaultLogLevel);

  const { verbose, quiet, silent, debug, help, _, ...others } = getopts(argv, {
    string: flagOptions.string,
    boolean: [...(flagOptions.boolean || []), ...logLevelFlags, 'help'],
    alias: {
      ...flagOptions.alias,
      v: 'verbose',
    },
    default: flagOptions.default,
    unknown: (name: string) => {
      unexpectedNames.add(name);
      return !!flagOptions.guessTypesForUnexpectedFlags;
    },
  });

  const unexpected: string[] = [];
  for (const unexpectedName of unexpectedNames) {
    const matchingArgv: string[] = [];

    iterArgv: for (const [i, v] of argv.entries()) {
      for (const prefix of ['--', '-']) {
        if (v.startsWith(prefix)) {
          // -/--name=value
          if (v.startsWith(`${prefix}${unexpectedName}=`)) {
            matchingArgv.push(v);
            continue iterArgv;
          }

          // -/--name (value possibly follows)
          if (v === `${prefix}${unexpectedName}`) {
            matchingArgv.push(v);

            // value follows -/--name
            if (argv.length > i + 1 && !argv[i + 1].startsWith('-')) {
              matchingArgv.push(argv[i + 1]);
            }

            continue iterArgv;
          }
        }
      }

      // special case for `--no-{flag}` disabling of boolean flags
      if (v === `--no-${unexpectedName}`) {
        matchingArgv.push(v);
        continue iterArgv;
      }

      // special case for shortcut flags formatted as `-abc` where `a`, `b`,
      // and `c` will be three separate unexpected flags
      if (
        unexpectedName.length === 1 &&
        v[0] === '-' &&
        v[1] !== '-' &&
        !v.includes('=') &&
        v.includes(unexpectedName)
      ) {
        matchingArgv.push(`-${unexpectedName}`);
        continue iterArgv;
      }
    }

    if (matchingArgv.length) {
      unexpected.push(...matchingArgv);
    } else {
      throw new Error(`unable to find unexpected flag named "${unexpectedName}"`);
    }
  }

  return {
    verbose,
    quiet,
    silent,
    debug,
    help,
    _,
    unexpected,
    ...others,
  };
}
