/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import glob from 'glob';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { Project } from './project';

export const PROJECTS = [
  new Project(resolve(REPO_ROOT, 'tsconfig.json')),
  new Project(resolve(REPO_ROOT, 'test/tsconfig.json'), { name: 'kibana/test' }),
  new Project(resolve(REPO_ROOT, 'x-pack/tsconfig.json')),
  new Project(resolve(REPO_ROOT, 'x-pack/test/tsconfig.json'), { name: 'x-pack/test' }),
  new Project(resolve(REPO_ROOT, 'src/core/tsconfig.json')),
  new Project(resolve(REPO_ROOT, 'x-pack/plugins/security_solution/cypress/tsconfig.json'), {
    name: 'security_solution/cypress',
  }),
  new Project(resolve(REPO_ROOT, 'x-pack/plugins/apm/e2e/tsconfig.json'), {
    name: 'apm/cypress',
    disableTypeCheck: true,
  }),
  new Project(resolve(REPO_ROOT, 'x-pack/plugins/apm/ftr_e2e/tsconfig.json'), {
    name: 'apm/ftr_e2e',
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
    .sync('src/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => new Project(resolve(REPO_ROOT, path))),
  ...glob
    .sync('x-pack/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
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
