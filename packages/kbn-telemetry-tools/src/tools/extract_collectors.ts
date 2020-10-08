/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { parseUsageCollection } from './ts_parser';
import { globAsync } from './utils';
import { TelemetryRC } from './config';

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
  const program = ts.createProgram(fullPaths, tsConfig);
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
