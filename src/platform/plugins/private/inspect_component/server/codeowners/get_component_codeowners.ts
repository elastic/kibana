/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { join, sep } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

export const getComponentCodeowners = (path: string) => {
  const codeownersPath = join(REPO_ROOT, '.github', 'CODEOWNERS');
  if (!existsSync(codeownersPath)) {
    return [];
  }

  const codeownersContent = readFileSync(codeownersPath, { encoding: 'utf8' });
  const codeownersLines = codeownersContent.split(/\r?\n/);
  const codeowners = codeownersLines
    .map((line) => line.trim())
    .filter((line) => line && line[0] !== '#');

  let folderPath = path;

  // Find the first matching folder in the codeowners file
  while (folderPath) {
    const found = codeowners.find((c) => c.startsWith(folderPath));
    if (found) {
      const parts = found.trim().split(/\s+/);
      return parts.slice(1);
    }
    const nextIndex = folderPath.lastIndexOf(sep);
    if (nextIndex === -1) break;
    folderPath = folderPath.substring(0, nextIndex);
  }

  return [];
};
