/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ts from 'typescript';
import * as path from 'path';
import { TaskContext } from './task_context';
import { extractCollectors, getProgramPaths } from '../extract_collectors';

export function extractCollectorsTask(
  { roots }: TaskContext,
  restrictProgramToPath?: string | string[]
) {
  return roots.map((root) => ({
    task: async () => {
      const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
      if (!tsConfig) {
        throw new Error('Could not find a valid tsconfig.json.');
      }
      const programPaths = await getProgramPaths(root.config);

      if (typeof restrictProgramToPath !== 'undefined') {
        const restrictProgramToPaths = Array.isArray(restrictProgramToPath)
          ? restrictProgramToPath
          : [restrictProgramToPath];

        const fullRestrictedPaths = restrictProgramToPaths.map((collectorPath) =>
          path.resolve(process.cwd(), collectorPath)
        );
        const restrictedProgramPaths = programPaths.filter((programPath) =>
          fullRestrictedPaths.includes(programPath)
        );
        if (restrictedProgramPaths.length) {
          root.parsedCollections = [...extractCollectors(restrictedProgramPaths, tsConfig)];
        }
        return;
      }

      root.parsedCollections = [...extractCollectors(programPaths, tsConfig)];
    },
    title: `Extracting collectors in ${root.config.root}`,
  }));
}
