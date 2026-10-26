/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncForEachWithLimit } from '@kbn/std';
import Fs from 'fs';

export interface EnzymeImportCounts {
  enzymeImportCount: number;
}

const count = (s: string, r: RegExp) => Array.from(s.matchAll(r)).length;

export async function countEnzymeImports(paths: string[]): Promise<EnzymeImportCounts> {
  let enzymeImportCount = 0;

  await asyncForEachWithLimit(paths, 100, async (path) => {
    const content = await Fs.promises.readFile(path, 'utf8');
    enzymeImportCount +=
      count(content, /import\s+[^;]*?from\s+['"]enzyme['"]/g) +
      count(content, /require\(['"]enzyme['"]\)/g);
  });

  return { enzymeImportCount };
}
