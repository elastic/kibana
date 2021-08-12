/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import glob from 'glob';
import Path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { Project, ProjectOptions } from './project';

/**
 * Simple map of all projects defined in this file, to speed of some other operations
 * which need to load files by path and to avoid re-parsing base config files hundreds of times
 */
export const PROJECT_CACHE = new Map<string, Project>();

const createProject = (rootRelativePath: string, options: ProjectOptions = {}) =>
  Project.load(Path.resolve(REPO_ROOT, rootRelativePath), options, {
    cache: PROJECT_CACHE,
  });

const findProjects = (pattern: string) =>
  // NOTE: using glob.sync rather than glob-all or globby
  // because it takes less than 10 ms, while the other modules
  // both took closer to 1000ms.
  glob.sync(pattern, { cwd: REPO_ROOT }).map((path) => createProject(path));

export const PROJECTS = [
  createProject('tsconfig.json'),
  createProject('test/tsconfig.json', { name: 'kibana/test' }),
  createProject('x-pack/test/tsconfig.json', { name: 'x-pack/test' }),
  createProject('src/core/tsconfig.json'),

  createProject('x-pack/plugins/drilldowns/url_drilldown/tsconfig.json', {
    name: 'security_solution/cypress',
  }),
  createProject('x-pack/plugins/security_solution/cypress/tsconfig.json', {
    name: 'security_solution/cypress',
  }),
  createProject('x-pack/plugins/osquery/cypress/tsconfig.json', {
    name: 'osquery/cypress',
  }),
  createProject('x-pack/plugins/apm/e2e/tsconfig.json', {
    name: 'apm/cypress',
    disableTypeCheck: true,
  }),
  createProject('x-pack/plugins/apm/ftr_e2e/tsconfig.json', {
    name: 'apm/ftr_e2e',
    disableTypeCheck: true,
  }),

  ...findProjects('packages/*/tsconfig.json'),
  ...findProjects('src/plugins/*/tsconfig.json'),
  ...findProjects('x-pack/plugins/*/tsconfig.json'),
  ...findProjects('examples/*/tsconfig.json'),
  ...findProjects('x-pack/examples/*/tsconfig.json'),
  ...findProjects('test/plugin_functional/plugins/*/tsconfig.json'),
  ...findProjects('test/interpreter_functional/plugins/*/tsconfig.json'),
  ...findProjects('test/server_integration/__fixtures__/plugins/*/tsconfig.json'),
];
