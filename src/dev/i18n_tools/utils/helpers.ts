/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import normalize from 'normalize-path';
import type { MakeDirectoryOptions, PathLike } from 'fs';
import { mkdir, writeFile as writeFileAsync } from 'fs/promises';
import { constants } from 'os';
import { MessageDescriptor } from '../types';

export function normalizePath(inputPath: string) {
  return normalize(path.relative('.', inputPath));
}

export function makeAbsolutePath(inputPath: string, withTrailingSlash?: boolean) {
  const absPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
  if (withTrailingSlash) {
    return path.join(absPath, path.sep);
  }

  return absPath;
}

export function arrayify(subj: unknown) {
  return Array.isArray(subj) ? subj : [subj];
}

export const descriptorDetailsStack = (
  messageDescriptor: MessageDescriptor,
  namespaceRoot: string
) => {
  return `
id: ${messageDescriptor.id}
message: ${messageDescriptor.defaultMessage}
file: ${messageDescriptor.file}
namespace: ${namespaceRoot}
`;
};

async function mkdirIfNotExists(dirPath: PathLike, options?: MakeDirectoryOptions) {
  return mkdir(dirPath, options).catch((err) => {
    if (err.code !== constants.errno.EEXIST) throw err;
  });
}

export const writeToFile = async (outputDir: string, filename: string, content: string) => {
  const outputDirPath = makeAbsolutePath(outputDir);
  await mkdirIfNotExists(outputDirPath, { recursive: true });

  const outputFilePath = path.join(outputDirPath, filename);
  const result = await writeFileAsync(outputFilePath, content);

  return {
    outputFilePath,
    result,
  };
};
