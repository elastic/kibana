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
