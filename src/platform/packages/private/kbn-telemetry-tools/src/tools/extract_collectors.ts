/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import globby from 'globby';
import * as path from 'path';
import type ts from 'typescript';
import { parseUsageCollection } from './ts_parser';
import type { TelemetryRC } from './config';
import { createKibanaProgram, getAllSourceFiles } from './ts_program';

const COLLECTOR_RE = /makeUsageCollector|makeStatsCollector/;

export async function getProgramPaths({
  root,
  exclude,
}: Pick<TelemetryRC, 'root' | 'exclude'>): Promise<string[]> {
  const filePaths = await globby(
    [
      '**/*.ts',
      '!**/node_modules/**',
      '!**/*.test.*',
      '!**/*.mock.*',
      '!**/mocks.*',
      '!**/__fixture__/**',
      '!**/__tests__/**',
      '!**/public/**',
      '!**/dist/**',
      '!**/target/**',
      '!**/*.d.ts',
    ],
    {
      cwd: root,
    }
  );

  if (filePaths.length === 0) {
    return [];
  }

  const fullPaths = filePaths
    .map((filePath) => path.join(root, filePath))
    .filter((fullPath) => !exclude.some((excludedPath) => fullPath.startsWith(excludedPath)));

  if (fullPaths.length === 0) {
    throw Error(`No paths covered from ${root} by the .telemetryrc.json`);
  }

  return fullPaths;
}

export function filterCollectorPaths(fullPaths: string[]): string[] {
  return fullPaths.filter((p) => COLLECTOR_RE.test(readFileSync(p, 'utf-8')));
}

export function* extractCollectors(fullPaths: string[], tsConfig: any) {
  const collectorPaths = filterCollectorPaths(fullPaths);

  if (collectorPaths.length === 0) {
    return;
  }

  const program = createKibanaProgram(collectorPaths, tsConfig);
  const sourceFiles = getAllSourceFiles(collectorPaths, program);

  for (const sourceFile of sourceFiles) {
    yield* parseUsageCollection(sourceFile, program);
  }
}

export function* extractCollectorsWithProgram(collectorPaths: string[], program: ts.Program) {
  if (collectorPaths.length === 0) {
    return;
  }
  const sourceFiles = getAllSourceFiles(collectorPaths, program);
  for (const sourceFile of sourceFiles) {
    yield* parseUsageCollection(sourceFile, program);
  }
}
