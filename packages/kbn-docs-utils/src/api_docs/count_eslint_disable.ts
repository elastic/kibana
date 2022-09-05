/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { asyncMapWithLimit } from '@kbn/std';
import Fs from 'fs';
import Path from 'path';

export interface EslintDisableCounts {
  eslintDisableLineCount: number;
  eslintDisableFileCount: number;
}

async function fetchAllFilePaths(path: string): Promise<string[]> {
  if ((await Fs.promises.stat(path)).isFile()) {
    return [path];
  }
  const filePaths: string[] = [];
  const dirContent = await Fs.promises.readdir(path, { withFileTypes: true });
  for (const item of dirContent) {
    const itemPath = Path.resolve(path, item.name);
    if (item.isDirectory()) {
      filePaths.push(...(await fetchAllFilePaths(itemPath)));
    } else if (item.isFile()) {
      filePaths.push(itemPath);
    }
  }
  return filePaths;
}

function findOccurrences(fileContent: string, regexp: RegExp): number {
  // using the flag 'g' returns an array of found occurrences.
  const matchingResults = fileContent.toString().match(new RegExp(regexp, 'g')) || [];
  return matchingResults.length;
}

async function countEsLintDisableInFile(path: string): Promise<EslintDisableCounts> {
  const fileContent = await Fs.promises.readFile(path, { encoding: 'utf8' });

  return {
    eslintDisableLineCount:
      findOccurrences(fileContent, /eslint-disable-next-line/) +
      findOccurrences(fileContent, /eslint-disable-line/),
    eslintDisableFileCount: findOccurrences(fileContent, /eslint-disable\s/),
  };
}

export async function countEslintDisableLines(path: string): Promise<EslintDisableCounts> {
  const filePaths = await fetchAllFilePaths(path);

  const allEslintDisableCounts = await asyncMapWithLimit(filePaths, 100, (filePath) =>
    countEsLintDisableInFile(filePath)
  );

  return allEslintDisableCounts.reduce(
    (acc, fileEslintDisableCounts) => {
      return {
        eslintDisableFileCount:
          acc.eslintDisableFileCount + fileEslintDisableCounts.eslintDisableFileCount,
        eslintDisableLineCount:
          acc.eslintDisableLineCount + fileEslintDisableCounts.eslintDisableLineCount,
      };
    },
    { eslintDisableFileCount: 0, eslintDisableLineCount: 0 }
  );
}
