/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import globby from 'globby';
import { dirname } from 'path';

export async function findFileUpwards(startDir: string, filename: string): Promise<string | null> {
  let currentDir = startDir;

  while (true) {
    const files = await globby(filename, { cwd: currentDir, absolute: true });

    if (files.length > 0) {
      return files[0]; // Return the first matching file found
    }

    // Get the parent directory
    const parentDir = dirname(currentDir);

    // Check if we've reached the root directory
    if (parentDir === currentDir) {
      return null; // File not found
    }

    currentDir = parentDir;
  }
}
