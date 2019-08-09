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

import { relative, resolve } from 'path';
import { REPO_ROOT } from '../constants';
import { File } from '../file';
import { Project } from './project';
import { PROJECTS } from './projects';

/**
 * Finds the `tsconfig.json` Project object for a specific path by looking through
 * Project instances defined in `src/dev/typescript/projects.ts`. If there isn't exactly one project
 * that includes the path an error is thrown with, hopefully, a helpful error
 * message that aims to help developers know how to fix the situation and ensure
 * that each TypeScript file maps to only a single `tsconfig.json` file.
 *
 * @param path Absolute path to a .ts file
 */
export function getTsProjectForAbsolutePath(path: string): Project {
  const relPath = relative(REPO_ROOT, path);
  const file = new File(resolve(REPO_ROOT, path));
  const projects = PROJECTS.filter(p => p.isAbsolutePathSelected(path));

  if (!projects.length) {
    throw new Error(
      `Unable to find tsconfig.json file selecting "${relPath}". Ensure one exists and it is listed in "src/dev/typescript/projects.ts"`
    );
  }

  if (projects.length !== 1 && !file.isTypescriptAmbient()) {
    const configPaths = projects.map(p => `"${relative(REPO_ROOT, p.tsConfigPath)}"`);

    const pathsMsg = `${configPaths.slice(0, -1).join(', ')} or ${
      configPaths[configPaths.length - 1]
    }`;

    throw new Error(
      `"${relPath}" is selected by multiple tsconfig.json files. This probably means the includes/excludes in ${pathsMsg} are too broad and include the code from multiple projects.`
    );
  }

  return projects[0];
}
