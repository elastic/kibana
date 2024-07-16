/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MakeDirectoryOptions, PathLike } from 'node:fs';
import { mkdir, writeFile as writeFileAsync } from 'node:fs/promises';
import { makeAbsolutePath } from './helpers';

async function mkdirIfNotExists(path: PathLike, options?: MakeDirectoryOptions) {
  return mkdir(path, options).catch((err) => {
    if (err.code !== 'EEXIST') throw err;
  });
}

export const writeToFile = async (outputDir: string, filename: string, content: string) => {
  const outputFilePath = makeAbsolutePath(path.resolve(outputDir, filename));

  await mkdirIfNotExists(outputFilePath, { recursive: true });
  const result = await writeFileAsync(outputFilePath, content);

  return {
    outputFilePath,
    result,
  };
};
