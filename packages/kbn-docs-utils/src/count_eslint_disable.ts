/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { asyncForEachWithLimit } from '@kbn/std';
import Fs from 'fs';

export interface EslintDisableCounts {
  eslintDisableLineCount: number;
  eslintDisableFileCount: number;
}

const count = (s: string, r: RegExp) => Array.from(s.matchAll(r)).length;

export async function countEslintDisableLines(paths: string[]): Promise<EslintDisableCounts> {
  let eslintDisableFileCount = 0;
  let eslintDisableLineCount = 0;

  await asyncForEachWithLimit(paths, 100, async (path) => {
    const content = await Fs.promises.readFile(path, 'utf8');

    eslintDisableLineCount +=
      count(content, /eslint-disable-next-line/g) + count(content, /eslint-disable-line/g);
    eslintDisableFileCount += count(content, /eslint-disable\s/g);
  });

  return { eslintDisableFileCount, eslintDisableLineCount };
}
