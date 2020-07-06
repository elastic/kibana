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

import glob from 'glob';
import { resolve } from 'path';
import { REPO_ROOT } from '../constants';
import { Project } from './project';

export const PROJECTS = [
  new Project(resolve(REPO_ROOT, 'tsconfig.json')),
  new Project(resolve(REPO_ROOT, 'test/tsconfig.json'), { name: 'kibana/test' }),
  new Project(resolve(REPO_ROOT, 'x-pack/tsconfig.json')),
  new Project(resolve(REPO_ROOT, 'x-pack/test/tsconfig.json'), { name: 'x-pack/test' }),
  new Project(resolve(REPO_ROOT, 'x-pack/plugins/security_solution/cypress/tsconfig.json'), {
    name: 'security_solution/cypress',
  }),
  new Project(resolve(REPO_ROOT, 'x-pack/plugins/apm/e2e/tsconfig.json'), {
    name: 'apm/cypress',
    disableTypeCheck: true,
  }),
  new Project(resolve(REPO_ROOT, 'x-pack/plugins/apm/scripts/tsconfig.json'), {
    name: 'apm/scripts',
    disableTypeCheck: true,
  }),

  // NOTE: using glob.sync rather than glob-all or globby
  // because it takes less than 10 ms, while the other modules
  // both took closer to 1000ms.
  ...glob
    .sync('packages/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => new Project(resolve(REPO_ROOT, path))),
  ...glob
    .sync('examples/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => new Project(resolve(REPO_ROOT, path))),
  ...glob
    .sync('x-pack/examples/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => new Project(resolve(REPO_ROOT, path))),
  ...glob
    .sync('test/plugin_functional/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => new Project(resolve(REPO_ROOT, path))),
  ...glob
    .sync('test/interpreter_functional/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => new Project(resolve(REPO_ROOT, path))),
];

export function filterProjectsByFlag(projectFlag?: string) {
  if (!projectFlag) {
    return PROJECTS;
  }

  const tsConfigPath = resolve(projectFlag);
  return PROJECTS.filter((project) => project.tsConfigPath === tsConfigPath);
}
