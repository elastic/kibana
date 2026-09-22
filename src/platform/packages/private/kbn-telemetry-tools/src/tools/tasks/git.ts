/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promisify } from 'util';
import { execFile } from 'child_process';
import type { TelemetrySchemaObject } from '../../schema_ftr_validations/schema_to_config_schema';

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 1024 * 1024 * 128;
let changedFilesCache: null | string[];

async function fetchChangedFilesSinceRef(ref: string): Promise<string[]> {
  const { stdout } = await execFileAsync('git', ['diff', '--name-only', `${ref}...HEAD`], {
    maxBuffer: MAX_BUFFER,
  });

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getChangedFilesSinceRef(ref: string): Promise<string[]> {
  changedFilesCache = changedFilesCache || (await fetchChangedFilesSinceRef(ref));
  return changedFilesCache;
}

async function getUncommitedChanges(): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['status', '--porcelain', '--', '.', ':!:config/node.options', ':!config/kibana.yml'],
    { maxBuffer: MAX_BUFFER }
  );

  return stdout
    .split('\n')
    .map((line) =>
      line
        .replace('?? ', '')
        .replace('A ', '')
        .replace('M ', '')
        .replace('D ', '')
        .replace('R ', '')
        .trim()
    );
}

export async function isTelemetrySchemaModified({
  path,
  baselineSha,
}: {
  path: string;
  baselineSha: string;
}): Promise<boolean> {
  const modifiedFiles = await getUncommitedChanges();
  if (modifiedFiles.includes(path)) {
    return true;
  }

  const changedFiles = await getChangedFilesSinceRef(baselineSha);
  return changedFiles.includes(path);
}

export async function fetchTelemetrySchemaAtRevision({
  path,
  ref,
}: {
  path: string;
  ref: string;
}): Promise<TelemetrySchemaObject> {
  const { stdout } = await execFileAsync('git', ['show', `${ref}:${path}`], {
    maxBuffer: MAX_BUFFER,
  });

  return JSON.parse(stdout) as TelemetrySchemaObject;
}
