/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import simpleGit from 'simple-git';

import { run } from '@kbn/dev-cli-runner';
import { getOwningTeamsForPath, getCodeOwnersEntries, CodeOwnersEntry } from '@kbn/code-owners';
import { asyncForEach } from '@kbn/std';
import { inspect } from 'util';

const git = simpleGit();

interface File {
  path: string;
  staged: boolean;
}

// Function to get the list of changed files
const getChangedFiles = async (): Promise<File[]> => {
  const { staged, files } = await git.status();
  return files.map((file) => ({ path: file.path, staged: staged.includes(file.path) }));
};

run(
  async ({ flags, log }) => {
    const {
      _: [owner],
    } = flags;

    const changedFiles = await getChangedFiles();
    const owners: { staged: Record<string, string[]>; unstaged: Record<string, string[]> } = {
      staged: {},
      unstaged: {},
    };

    let codeOwnersEntries: CodeOwnersEntry[] = [];

    try {
      codeOwnersEntries = getCodeOwnersEntries();
    } catch (e) {
      log.error('CODEOWNERS cannot be read.');
      process.exit(1);
    }

    const getOwners = (file: string) => {
      const teams = getOwningTeamsForPath(file, codeOwnersEntries);

      if (teams.length === 0) {
        log.warning(`No owner found for ${file}`);
        return [];
      }

      return teams;
    };

    for (const file of changedFiles) {
      const fileOwners = getOwners(file.path);

      if (fileOwners) {
        await asyncForEach(fileOwners, async (fileOwner) => {
          const loc = file.staged ? 'staged' : 'unstaged';

          owners[loc][fileOwner] = [
            ...(owners[loc][fileOwner] || []),
            file.path + (fileOwners.length > 1 ? ` (+${fileOwners.length - 1})` : ''),
          ];

          if (owner && fileOwner === owner) {
            await git.add(file.path);
            log.info(`Staged ${file.path}`);
          }
        });
      }
    }

    if (!owner) {
      log.info(inspect(owners, { colors: true, depth: null }));
    }

    log.info('Done.');
  },
  {
    usage: 'node src/dev/stage_by_owner.ts [owner]',
    description: `
      This script stages files based on the CODEOWNERS file.
      If an owner is provided, it stages the files owned by that owner.
      Otherwise, it outputs changed files, grouped by owner.
    `,
  }
);
