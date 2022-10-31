/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';
import Path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { BAZEL_PACKAGE_DIRS } from '@kbn/bazel-packages';
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

const findProjects = (patterns: string[]) =>
  globby.sync(patterns, { cwd: REPO_ROOT }).map((path) => createProject(path));

export const PROJECTS = [
  createProject('tsconfig.json'),
  createProject('test/tsconfig.json', { name: 'kibana/test' }),
  createProject('x-pack/test/tsconfig.json', { name: 'x-pack/test' }),
  createProject('x-pack/performance/tsconfig.json', { name: 'x-pack/performance' }),
  createProject('src/core/tsconfig.json'),
  createProject('.buildkite/tsconfig.json', {
    // this directory has additionally dependencies which scripts/type_check can't guarantee
    // are present or up-to-date, and users likely won't know how to manage either, so the
    // type check is explicitly disabled in this project for now
    disableTypeCheck: true,
  }),
  createProject('kbn_pm/tsconfig.json'),

  createProject('x-pack/plugins/drilldowns/url_drilldown/tsconfig.json', {
    name: 'security_solution/cypress',
  }),
  createProject('x-pack/plugins/security_solution/cypress/tsconfig.json', {
    name: 'security_solution/cypress',
  }),
  createProject(
    'x-pack/plugins/enterprise_search/public/applications/shared/cypress/tsconfig.json',
    { name: 'enterprise_search/shared/cypress' }
  ),
  createProject(
    'x-pack/plugins/enterprise_search/public/applications/enterprise_search_overview/cypress/tsconfig.json',
    { name: 'enterprise_search/overview/cypress' }
  ),
  createProject(
    'x-pack/plugins/enterprise_search/public/applications/app_search/cypress/tsconfig.json',
    { name: 'enterprise_search/app_search/cypress' }
  ),
  createProject(
    'x-pack/plugins/enterprise_search/public/applications/workplace_search/cypress/tsconfig.json',
    { name: 'enterprise_search/workplace_search/cypress' }
  ),
  createProject('x-pack/plugins/osquery/cypress/tsconfig.json', {
    name: 'osquery/cypress',
  }),
  createProject('x-pack/plugins/apm/ftr_e2e/tsconfig.json', {
    name: 'apm/ftr_e2e',
    disableTypeCheck: true,
  }),
  createProject('x-pack/plugins/fleet/cypress/tsconfig.json', {
    name: 'fleet/cypress',
  }),
  createProject('x-pack/plugins/synthetics/e2e/tsconfig.json', {
    name: 'uptime/synthetics-e2e-tests',
    disableTypeCheck: true,
  }),
  createProject('x-pack/plugins/ux/e2e/tsconfig.json', {
    name: 'ux/synthetics-e2e-tests',
    disableTypeCheck: true,
  }),
  createProject('x-pack/plugins/observability/e2e/tsconfig.json', {
    name: 'observability/synthetics-e2e-tests',
    disableTypeCheck: true,
  }),
  createProject('x-pack/plugins/threat_intelligence/cypress/tsconfig.json', {
    name: 'threat_intelligence/cypress',
    disableTypeCheck: true,
  }),

  // Glob patterns to be all search at once
  ...findProjects([
    'src/plugins/*/tsconfig.json',
    'src/plugins/chart_expressions/*/tsconfig.json',
    'src/plugins/vis_types/*/tsconfig.json',
    'examples/*/tsconfig.json',
    'test/*/plugins/*/tsconfig.json',
    'test/analytics/fixtures/plugins/*/tsconfig.json',
    'test/server_integration/__fixtures__/plugins/*/tsconfig.json',
    'test/interactive_setup_api_integration/fixtures/*/tsconfig.json',
    'x-pack/plugins/*/tsconfig.json',
    'x-pack/plugins/cloud_integrations/*/tsconfig.json',
    'x-pack/examples/*/tsconfig.json',
    'x-pack/test/*/plugins/*/tsconfig.json',
    ...BAZEL_PACKAGE_DIRS.map((dir) => `${dir}/*/tsconfig.json`),
  ]),
];
