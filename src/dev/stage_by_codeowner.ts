/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { run } from '@kbn/dev-cli-runner';

const git = simpleGit();

const CODEOWNERS_PATH = path.join('.github', 'CODEOWNERS');

// Function to get the list of changed files
const getChangedFiles = async () => {
  const status = await git.status();
  return status.files.map((file) => file.path);
};

run(async ({ flags, log }) => {
  const {
    _: [owner],
  } = flags;

  if (!fs.existsSync(CODEOWNERS_PATH)) {
    log.error('CODEOWNERS file not found!');
    process.exit(1);
  }

  const changedFiles = await getChangedFiles();
  const owners: Record<string, string[]> = {};

  const getOwner = (file: string) => {
    const codeowners = fs
      .readFileSync(CODEOWNERS_PATH, 'utf-8')
      .split('\n')
      .filter((line) => line && !line.trim().startsWith('#'));

    for (const line of codeowners) {
      const [pattern, fileOwner] = line.split(/\s+/);
      if (file.startsWith(pattern)) {
        return fileOwner;
      }
    }

    log.warning(`No owner found for ${file}`);

    return null;
  };

  for (const file of changedFiles) {
    const fileOwner = getOwner(file);

    if (fileOwner) {
      owners[fileOwner] = [...(owners[fileOwner] || []), file];
    }

    if (owner && fileOwner === owner) {
      await git.add(file);
      log.info(`Staged ${file}`);
    }
  }
  if (!owner) {
    log.info('Files by owner:', owners);
  }

  log.info('Done.');
});
