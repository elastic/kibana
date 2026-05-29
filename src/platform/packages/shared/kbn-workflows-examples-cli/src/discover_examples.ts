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

export interface DiscoveryOptions {
  readonly recursive?: boolean;
}

export async function discoverExampleFiles(
  rootDir: string,
  options: DiscoveryOptions = {}
): Promise<readonly string[]> {
  const recursive = options.recursive ?? true;
  const found: string[] = [];
  await walk(rootDir, recursive, found);
  return found.sort();
}

async function walk(dir: string, recursive: boolean, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absolute = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) await walk(absolute, recursive, out);
      continue;
    }
    if (entry.isFile() && YAML_EXT.test(entry.name)) {
      out.push(absolute);
    }
  }
}
