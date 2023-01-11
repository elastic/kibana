/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TsProject } from './ts_project';

export const TS_PROJECTS = TsProject.loadAll({
  /** Array of repo-relative paths to projects which should be ignored and not treated as a TS project in the repo */
  ignore: [
    'x-pack/plugins/apm/scripts/optimize_tsconfig/tsconfig.json',
    'packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/**/*',
  ],

  /** Array of repo-relative paths to projects which should have their type-check disabled */
  disableTypeCheck: [
    // this directory has additionally dependencies which scripts/type_check can't guarantee
    // are present or up-to-date, and users likely won't know how to manage either, so the
    // type check is explicitly disabled in this project for now
    '.buildkite/tsconfig.json',

    'x-pack/plugins/synthetics/e2e/tsconfig.json',
    'x-pack/plugins/ux/e2e/tsconfig.json',
    'x-pack/plugins/observability/e2e/tsconfig.json',
    'x-pack/plugins/threat_intelligence/cypress/tsconfig.json',
  ],
});
