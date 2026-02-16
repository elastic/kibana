/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { REPO_ROOT } from '@kbn/repo-info';

const execFileAsync = promisify(execFile);

/**
 * Find the remote that points to elastic/kibana
 * People use different names: "upstream", "elastic", "kibana", etc.
 */
export async function findElasticKibanaRemote(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['remote', '-v'], { cwd: REPO_ROOT });
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      if (
        line.includes('elastic/kibana') ||
        line.includes('github.com:elastic/kibana') ||
        line.includes('github.com/elastic/kibana')
      ) {
        const remoteName = line.split(/\s+/)[0];
        return remoteName;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}
