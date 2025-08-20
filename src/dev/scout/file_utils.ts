/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';

export async function findSourceFileRecursive(dir: string, exts: string[]): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await findSourceFileRecursive(res, exts);
        if (found) return found;
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        return res;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function parseKibanaJsonc(pluginPath: string): Promise<any> {
  const kibanaJsonPath = path.join(pluginPath, 'kibana.jsonc');
  try {
    const content = await fs.readFile(kibanaJsonPath, 'utf-8');
    const cleaned = content.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Could not read or parse kibana.jsonc at ${kibanaJsonPath}: ${e.message}`);
  }
}
