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

import { runCommand } from './run_command';
import { scanCommand } from './scan_command';

const SUPPORTED_COMMANDS = ['run', 'scan'];

export function cli(): void {
  run(
    async ({ log, flags, flagsReader }) => {
      const args = flagsReader.getPositionals();
      const command = args[0];

      if (!command) {
        throw createFailError(
          `No command specified. Usage: node scripts/yarn_install_scripts <${SUPPORTED_COMMANDS.join(
            '|'
          )}>`
        );
      }

      if (!SUPPORTED_COMMANDS.includes(command)) {
        throw createFailError(
          `Invalid command: ${command}. Must be one of: ${SUPPORTED_COMMANDS.join(', ')}`
        );
      }

      if (command === 'run') runCommand(log, Boolean(flags.verbose), Boolean(flags['dry-run']));
      if (command === 'scan') scanCommand(log, Boolean(flags.validate));
    },
    {
      usage: `node scripts/yarn_install_scripts <run|scan> [options]`,
      description: 'Manage yarn install lifecycle scripts for dependencies',
      flags: {
        boolean: ['verbose', 'validate', 'dry-run'],
        default: {
          verbose: false,
          validate: false,
          'dry-run': false,
        },
        help: `
          Commands:
            run   - Run allowed install scripts
            scan  - List packages with install scripts

          Options for 'run':
            --verbose           Show full output from install scripts
            --dry-run           Show which install scripts would be run without running them

          Options for 'scan':
            --validate          Exit with error if any scripts are unconfigured
        `,
      },
    }
  );
}
