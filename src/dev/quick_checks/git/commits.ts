/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { COLLECT_COMMITS_MARKER_FILE } from '../config';

/**
 * Handle commits made during checks (push them and clean up)
 */
export async function handleCommits(log: ToolingLog): Promise<boolean> {
  if (!wereCommitsMade()) {
    return false;
  }

  log.write('--- Commits were made during checks. Pushing all changes now...');

  try {
    await pushCommits();
    log.write('--- Successfully pushed all commits.');
    cleanupMarkerFile();
    log.write('--- Build will fail to trigger a new build with the fixes.');
    return true;
  } catch (error) {
    log.error(`--- Failed to push commits: ${error}`);
    throw error;
  }
}

/**
 * Push any commits made during checks
 */
export async function pushCommits(): Promise<void> {
  return new Promise((resolve, reject) => {
    const pushProcess = execFile('git', ['push'], {
      cwd: REPO_ROOT,
      env: { ...process.env },
    });

    let output = '';
    const appendToOutput = (data: string | Buffer) => (output += data.toString());

    pushProcess.stdout?.on('data', appendToOutput);
    pushProcess.stderr?.on('data', appendToOutput);

    pushProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`git push failed with code ${code}: ${output}`));
      }
    });

    pushProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Clean up any existing marker file from previous runs
 */
export function cleanupMarkerFile(): void {
  if (existsSync(COLLECT_COMMITS_MARKER_FILE)) {
    unlinkSync(COLLECT_COMMITS_MARKER_FILE);
  }
}

/**
 * Check if commits were made during the check run
 */
export function wereCommitsMade(): boolean {
  return existsSync(COLLECT_COMMITS_MARKER_FILE);
}
