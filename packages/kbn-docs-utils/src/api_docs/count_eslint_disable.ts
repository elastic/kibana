/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { exec } from 'child_process';
// import { promisify } from 'util';
import Fs from 'fs';
import Path from 'path';

export interface EslintDisableCounts {
  eslintDisableLineCount: number;
  eslintDisableFileCount: number;
}

// const execAsync = promisify(exec);

async function fetchAllFilePaths(path: string): Promise<string[]> {
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
  const fileContent = await Fs.promises.readFile(path, { encoding: 'utf8' }).catch((err) => {
    console.error(`Error reading contents of file ${path}`, err);
    return '';
  });

  return {
    eslintDisableLineCount:
      findOccurrences(fileContent, /eslint-disable-next-line/) +
      findOccurrences(fileContent, /eslint-disable-line/),
    eslintDisableFileCount: findOccurrences(fileContent, /eslint-disable/),
  };
}

export async function countEslintDisableLine(path: string): Promise<EslintDisableCounts> {
  const filePaths = await fetchAllFilePaths(path);

  const allEslintDisableCounts = await Promise.all(
    filePaths.map((filePath) => countEsLintDisableInFile(filePath))
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

  // const disableCountOutputs = false
  //   ? await Promise.all([
  //       execAsync(`grep -rE 'eslint-disable-next-line|eslint-disable-line' ${path} | wc -l`),
  //       execAsync(`grep -rE 'eslint-disable ' ${path} | wc -l`),
  //     ])
  //   : [{ stdout: '0' }, { stdout: '0' }];
  // const eslintDisableLineCount = Number.parseInt(disableCountOutputs[0].stdout.toString(), 10);
  //
  // if (eslintDisableLineCount === undefined || isNaN(eslintDisableLineCount)) {
  //   throw new Error(`Parsing ${disableCountOutputs[0]} failed to product a valid number`);
  // }
  //
  // const eslintDisableFileCount = Number.parseInt(disableCountOutputs[1].stdout.toString(), 10);
  //
  // if (eslintDisableFileCount === undefined || isNaN(eslintDisableFileCount)) {
  //   throw new Error(`Parsing ${disableCountOutputs[1]} failed to product a valid number`);
  // }
  //
  // return { eslintDisableFileCount, eslintDisableLineCount };
}
