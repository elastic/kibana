/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run, createFlagError, Flags } from '@kbn/dev-utils';
import fs from 'fs';
import Path from 'path';
import { savePrsToCsv } from './find_and_save_prs';

function getLabelsPath(flags: Flags) {
  if (typeof flags.path !== 'string') {
    throw createFlagError('please provide a single --path flag');
  }

  if (!fs.existsSync(Path.resolve(flags.path))) {
    throw createFlagError('please provide an existing json file with --path flag');
  }

  return Path.resolve(flags.path);
}

export async function getPullRequests() {
  run(
    async ({ log, flags }) => {
      const githubToken = process.env.GITHUB_TOKEN;

      if (!githubToken) {
        throw new Error('GITHUB_TOKEN was not provided.');
      }

      const labelsPath = getLabelsPath(flags);

      if (typeof flags.dest !== 'string') {
        throw createFlagError('please provide path to save csv --dest flag');
      }

      let mergedSince = '';

      if (flags['merged-since']) {
        mergedSince = flags['merged-since'] as string;
        if (!/\d{4}-\d{2}-\d{2}/.test(mergedSince)) {
          throw createFlagError('please provide a valid date in --merged-since flag');
        }
      }

      fs.mkdirSync(flags.dest, { recursive: true });
      const filename = Path.resolve(
        flags.dest,
        `kibana_prs_${new Date().toISOString().split('T').join('-')}.csv`
      );
      await savePrsToCsv(log, githubToken, labelsPath, filename, mergedSince);
    },
    {
      description: `
        Create a csv file with PRs to be tests for upcoming release
    `,
      flags: {
        string: ['path', 'dest', 'merged-since'],
        help: `
        --path             Required, path to json file to operate on, see src/dev/example.json
        --dest             Required, path to the save csv file to
        --merged-since     Optional, date 'yyyy-mm-dd' to look PRs from
      `,
      },
    }
  );
}
