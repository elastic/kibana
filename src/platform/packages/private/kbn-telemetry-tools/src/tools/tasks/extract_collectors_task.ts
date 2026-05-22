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
import type { TaskContext } from './task_context';
import {
  extractCollectorsWithProgram,
  filterCollectorPaths,
  getProgramPaths,
} from '../extract_collectors';
import { createKibanaProgram } from '../ts_program';

export function extractCollectorsTask(
  { roots }: TaskContext,
  restrictProgramToPath?: string | string[]
) {
  return [
    {
      task: async () => {
        const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
        if (!tsConfig) {
          throw new Error('Could not find a valid tsconfig.json.');
        }

        const rootPathsMap = new Map<number, string[]>();
        await Promise.all(
          roots.map(async (root, idx) => {
            const programPaths = await getProgramPaths(root.config);
            rootPathsMap.set(idx, programPaths);
          })
        );

        const rootCollectorMap = new Map<number, string[]>();
        let allCollectorPaths: string[] = [];

        for (const [idx, programPaths] of rootPathsMap) {
          let paths = programPaths;

          if (typeof restrictProgramToPath !== 'undefined') {
            const restrictProgramToPaths = Array.isArray(restrictProgramToPath)
              ? restrictProgramToPath
              : [restrictProgramToPath];
            const fullRestrictedPaths = restrictProgramToPaths.map((collectorPath) =>
              path.resolve(process.cwd(), collectorPath)
            );
            paths = paths.filter((p) => fullRestrictedPaths.includes(p));
          }

          const collectorPaths = filterCollectorPaths(paths);
          rootCollectorMap.set(idx, collectorPaths);
          allCollectorPaths = allCollectorPaths.concat(collectorPaths);
        }

        if (allCollectorPaths.length === 0) {
          return;
        }

        const program = createKibanaProgram(allCollectorPaths, tsConfig);

        for (const [idx, collectorPaths] of rootCollectorMap) {
          roots[idx].parsedCollections = [...extractCollectorsWithProgram(collectorPaths, program)];
        }
      },
      title: 'Extracting collectors across all roots',
    },
  ];
}
