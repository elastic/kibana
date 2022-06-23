/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { parseUsageCollection } from './ts_parser';
import { globAsync } from './utils';
import { TelemetryRC } from './config';
import { compilerHost } from './compiler_host';

export async function getProgramPaths({
  root,
  exclude,
}: Pick<TelemetryRC, 'root' | 'exclude'>): Promise<string[]> {
  const filePaths = await globAsync('**/*.ts', {
    cwd: root,
    ignore: [
      '**/node_modules/**',
      '**/*.test.*',
      '**/*.mock.*',
      '**/mocks.*',
      '**/__fixture__/**',
      '**/__tests__/**',
      '**/public/**',
      '**/dist/**',
      '**/target/**',
      '**/*.d.ts',
    ],
  });

  if (filePaths.length === 0) {
    throw Error(`No files found in ${root}`);
  }

  const fullPaths = filePaths
    .map((filePath) => path.join(root, filePath))
    .filter((fullPath) => !exclude.some((excludedPath) => fullPath.startsWith(excludedPath)));

  if (fullPaths.length === 0) {
    throw Error(`No paths covered from ${root} by the .telemetryrc.json`);
  }

  return fullPaths;
}

export function* extractCollectors(fullPaths: string[], tsConfig: any) {
  const program = ts.createProgram(fullPaths, tsConfig, compilerHost);
  program.getTypeChecker();
  const sourceFiles = fullPaths.map((fullPath) => {
    const sourceFile = program.getSourceFile(fullPath);
    if (!sourceFile) {
      throw Error(`Unable to get sourceFile ${fullPath}.`);
    }
    return sourceFile;
  });

  for (const sourceFile of sourceFiles) {
    yield* parseUsageCollection(sourceFile, program);
  }
}
