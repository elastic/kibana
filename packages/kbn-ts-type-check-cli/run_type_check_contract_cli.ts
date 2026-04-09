/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import {
  readValidationRunFlags,
  resolveValidationBaseContext,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from '@kbn/dev-validation-runner';

import { cleanTypeCheckCaches, executeTypeCheckValidation } from './execute_type_check_validation';
import { normalizeProjectPath } from './src/normalize_project_path';

/** Runs the validation-contract-aware `scripts/type_check` CLI entrypoint. */
export const runTypeCheckContractCli = () => {
  run(
    async ({ log, flagsReader, procRunner }) => {
      if (flagsReader.boolean('clean-cache')) {
        const { TS_PROJECTS } = await import('@kbn/ts-projects');
        await cleanTypeCheckCaches(log, TS_PROJECTS);
        return;
      }

      const projectFilter = normalizeProjectPath(flagsReader.path('project'), log);
      const validationRunFlags = readValidationRunFlags(flagsReader);
      const baseContext = await resolveValidationBaseContext({
        flags: validationRunFlags,
        directTarget: projectFilter,
        runnerDescription: 'type check',
        onWarning: (message) => log.warning(message),
      });

      await executeTypeCheckValidation({
        baseContext,
        log,
        procRunner,
        cleanup: flagsReader.boolean('cleanup'),
        extendedDiagnostics: flagsReader.boolean('extended-diagnostics'),
        verbose: flagsReader.boolean('verbose'),
        withArchive: flagsReader.boolean('with-archive'),
      });
    },
    {
      description: `
      Run the TypeScript compiler using the shared validation contract to select scoped projects.

      Examples:
        # run the quick validation profile
        node scripts/type_check --profile quick

        # run the agent validation profile
        node scripts/type_check --profile agent

        # run PR-equivalent affected selection
        node scripts/type_check --profile pr

        # check all TypeScript projects
        node scripts/type_check --profile full

        # branch scope with explicit refs
        node scripts/type_check --scope branch --base-ref origin/main --head-ref HEAD
    `,
      flags: {
        string: ['project', ...VALIDATION_RUN_STRING_FLAGS],
        boolean: ['clean-cache', 'cleanup', 'extended-diagnostics', 'with-archive'],
        help: `
        --project [path]        Path to a tsconfig.json file for direct-target execution
${VALIDATION_RUN_HELP}
        --help                  Show this message
        --clean-cache           Delete any existing TypeScript caches before running type check
        --cleanup               Pass to avoid leaving temporary tsconfig files on disk. Leaving these
                                  files in place makes subsequent executions faster because ts can
                                  identify that none of the imports have changed (it uses creation/update
                                  times) but cleaning them prevents leaving garbage around the repo.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --with-archive          Restore cached artifacts before running and archive results afterwards
      `,
      },
    }
  );
};
