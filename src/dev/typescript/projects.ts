/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import glob from 'glob';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { Project } from './project';

export const PROJECTS = [
  Project.at(resolve(REPO_ROOT, 'tsconfig.json')),
  Project.at(resolve(REPO_ROOT, 'test/tsconfig.json'), { name: 'kibana/test' }),
  Project.at(resolve(REPO_ROOT, 'x-pack/test/tsconfig.json'), { name: 'x-pack/test' }),
  Project.at(resolve(REPO_ROOT, 'src/core/tsconfig.json')),
  Project.at(resolve(REPO_ROOT, 'x-pack/plugins/drilldowns/url_drilldown/tsconfig.json'), {
    name: 'security_solution/cypress',
  }),
  Project.at(resolve(REPO_ROOT, 'x-pack/plugins/security_solution/cypress/tsconfig.json'), {
    name: 'security_solution/cypress',
  }),
  Project.at(resolve(REPO_ROOT, 'x-pack/plugins/osquery/cypress/tsconfig.json'), {
    name: 'osquery/cypress',
  }),
  Project.at(resolve(REPO_ROOT, 'x-pack/plugins/apm/e2e/tsconfig.json'), {
    name: 'apm/cypress',
    disableTypeCheck: true,
  }),
  Project.at(resolve(REPO_ROOT, 'x-pack/plugins/apm/ftr_e2e/tsconfig.json'), {
    name: 'apm/ftr_e2e',
    disableTypeCheck: true,
  }),

  // NOTE: using glob.sync rather than glob-all or globby
  // because it takes less than 10 ms, while the other modules
  // both took closer to 1000ms.
  ...glob
    .sync('packages/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('src/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('x-pack/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('examples/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('x-pack/examples/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('test/plugin_functional/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('test/interpreter_functional/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
  ...glob
    .sync('test/server_integration/__fixtures__/plugins/*/tsconfig.json', { cwd: REPO_ROOT })
    .map((path) => Project.at(resolve(REPO_ROOT, path))),
];
