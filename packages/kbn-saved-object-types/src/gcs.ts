/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import * as os from 'os';
import { execSync } from 'child_process';
import { basename, resolve } from 'path';
import { downloadFile } from './util/download_file';
import type { MigrationSnapshot } from './types';

const SO_MIGRATIONS_BUCKET_PREFIX = 'https://storage.googleapis.com/kibana-so-types-snapshots';

export async function fetchSnapshotFromGCSBucket({
  gitRev,
  log,
}: {
  gitRev: string;
  log: ToolingLog;
}): Promise<MigrationSnapshot> {
  const fullCommitHash = expandGitRev(gitRev);
  const googleCloudUrl = `${SO_MIGRATIONS_BUCKET_PREFIX}/${fullCommitHash}.json`;
  const path = await downloadToTemp(googleCloudUrl, log);
  return await loadSnapshotFromFile(path);
}

async function downloadToTemp(googleCloudUrl: string, log: ToolingLog): Promise<string> {
  const fileName = basename(googleCloudUrl);
  const filePath = resolve(os.tmpdir(), fileName);

  if (existsSync(filePath)) {
    log.info('✅ ' + filePath);
    return filePath;
  } else {
    try {
      log.info('🌐 GET ' + googleCloudUrl);
      await downloadFile(googleCloudUrl, filePath);
      log.info('✅ ' + filePath);
      return filePath;
    } catch (err) {
      log.error("Couldn't download snapshot from: " + googleCloudUrl);
      throw err;
    }
  }
}

async function loadSnapshotFromFile(filePath: string): Promise<MigrationSnapshot> {
  try {
    const fileContent = await readFile(filePath, { encoding: 'utf-8' });
    return JSON.parse(fileContent);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Snapshot file not found: ${filePath}`);
    } else if (err.message.includes('Unexpected token')) {
      throw new Error(`Snapshot file is not a valid JSON: ${filePath}`);
    } else {
      throw err;
    }
  }
}

function expandGitRev(gitRev: string) {
  if (gitRev.match(/^[0-9a-f]{40}$/)) {
    return gitRev;
  } else {
    try {
      return execSync(`git rev-parse ${gitRev}`, { stdio: ['pipe', 'pipe', null] })
        .toString()
        .trim();
    } catch (err) {
      throw new Error(`Couldn't expand git rev: ${gitRev} - ${err.message}`);
    }
  }
}
