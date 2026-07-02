/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdir } from 'fs/promises';
import Path from 'path';

const YAML_EXT = /\.ya?ml$/i;

export async function discoverExampleFiles(rootDir: string): Promise<readonly string[]> {
  const found: string[] = [];
  await walk(rootDir, found);
  return found.sort();
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absolute = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, out);
      continue;
    }
    if (entry.isFile() && YAML_EXT.test(entry.name)) {
      out.push(absolute);
    }
  }
}
