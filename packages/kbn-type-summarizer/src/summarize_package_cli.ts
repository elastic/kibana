/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'source-map-support/register';

import Path from 'path';
import getopts from 'getopts';

import { run } from './lib/run';
import { CliError } from './lib/cli_error';
import { summarizePackage } from './summarize_package';

const HELP = `
node scripts/summarize_package [...inputPaths]

Summarize the publicly accessible types of a module

options:
  --project          location of the tsconfig.json file for the built package
  --output           directory where type summaries and source-maps should be written
  --help, -h         show this help text
  --silent           disable all logging
  --quiet            only log warnings and errors
  --debug, -d        also log debug messages
  --verbose, -v      log all posssible messages
`;

export function runSummarizePackageCli() {
  run(
    async ({ argv, log }) => {
      const unknownFlags = [];

      const flags = getopts(argv, {
        alias: {
          v: 'verbose',
          d: 'debug',
          h: 'help',
        },
        boolean: ['help', 'verbose', 'debug', 'quiet', 'silent'],
        default: {},
        string: ['output', 'project'],
        unknown(name) {
          unknownFlags.push(name);
          return false;
        },
      });

      if (flags.help) {
        process.stdout.write(HELP);
        return;
      }

      // capture this as the root that all paths were resolved against
      const cwd = process.cwd();

      if (!flags._.length) {
        throw new CliError('no input paths provided', { showHelp: true });
      }
      const inputPaths = flags._.map((path) => Path.resolve(cwd, path));

      if (!flags.project) {
        throw new CliError('--project is a required flag', { showHelp: true });
      }
      const tsconfigPath = Path.resolve(cwd, flags.project);
      const repoRelativePackageDir = Path.dirname(tsconfigPath);

      if (!flags.output) {
        throw new CliError('--output is a required flag', { showHelp: true });
      }
      const outputDir = Path.resolve(cwd, flags.output);

      const dtsDir = inputPaths.map((p) => Path.dirname(p)).sort((a, b) => a.length - b.length)[0];

      await summarizePackage(log, {
        dtsDir,
        inputPaths,
        outputDir,
        tsconfigPath,
        repoRelativePackageDir,
      });
    },
    {
      helpText: HELP,
    }
  );
}
