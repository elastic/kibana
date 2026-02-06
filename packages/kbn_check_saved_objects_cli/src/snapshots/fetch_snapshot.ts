/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import * as os from 'os';
import { basename, resolve } from 'path';
import { downloadFile } from '../util';
import type { MigrationSnapshot } from '../types';

const SO_MIGRATIONS_BUCKET_PREFIX = 'https://storage.googleapis.com/kibana-so-types-snapshots';

export async function fetchSnapshot(gitRev: string): Promise<MigrationSnapshot> {
  const googleCloudUrl = `${SO_MIGRATIONS_BUCKET_PREFIX}/${gitRev}.json`;
  const path = await downloadToTemp(googleCloudUrl);
  return await loadSnapshotFromFile(path);
}

async function downloadToTemp(googleCloudUrl: string): Promise<string> {
  const fileName = basename(googleCloudUrl);
  const filePath = resolve(os.tmpdir(), fileName);

  if (existsSync(filePath)) {
    return filePath;
  } else {
    try {
      await downloadFile(googleCloudUrl, filePath);
      return filePath;
    } catch (err) {
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
