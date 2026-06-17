/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { findCodeOwnersEntryForPath } from './code_owners';
import { throwIfPathIsMissing, throwIfPathNotInRepo } from './path';

/**
 * CLI entrypoint for finding code owners for a given path.
 */
export async function findCodeOwnersForPath() {
  await run(
    async ({ flagsReader, log }) => {
      const targetPath = flagsReader.requiredPath('path');
      throwIfPathIsMissing(targetPath, 'Target path', true);
      throwIfPathNotInRepo(targetPath, true);

      const codeOwnersEntry = findCodeOwnersEntryForPath(targetPath);

      if (!codeOwnersEntry) {
        log.warning(`No matching code owners entry found for path ${targetPath}`);
        return;
      }

      if (flagsReader.boolean('json')) {
        // Replacer function that hides irrelevant fields in JSON output
        const hideIrrelevantFields = (k: string, v: any) => {
          return ['matcher'].includes(k) ? undefined : v;
        };

        log.write(JSON.stringify(codeOwnersEntry, hideIrrelevantFields, 2));
        return;
      }

      log.write(`Matching pattern: ${codeOwnersEntry.pattern}`);
      log.write('Teams:', codeOwnersEntry.teams);
      log.write('Areas:', codeOwnersEntry.areas);
    },
    {
      description: `Find code owners for a given path in this local Kibana repository`,
      flags: {
        string: ['path'],
        boolean: ['json'],
        help: `
        --path             Path to find owners for (required)
        --json             Output result as JSON`,
      },
    }
  );
}
