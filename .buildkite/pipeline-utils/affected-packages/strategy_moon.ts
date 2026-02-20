/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { getKibanaDir } from '../utils';

const REPO_ROOT = getKibanaDir();

/**
 * Moon-based strategy: Use moon query to get affected projects
 */
export function getAffectedPackagesMoon(
  mergeBase: string,
  includeDownstream: boolean
): Set<string> {
  // Build the moon query command
  const downstreamFlag = includeDownstream ? '--downstream deep' : '';
  const command = `moon query projects --affected ${downstreamFlag} --json`;

  const output = execSync(command, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    env: {
      ...process.env,
      MOON_BASE: mergeBase,
    },
    timeout: 120000, // 2 minutes (moon can be slow)
  });

  const result = JSON.parse(output);

  // Extract project IDs from the response
  const packageIds = new Set<string>();
  if (result.projects && Array.isArray(result.projects)) {
    for (const project of result.projects) {
      if (project.id) {
        packageIds.add(project.id);
      }
    }
  }

  return packageIds;
}
