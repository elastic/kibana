/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TsProject } from './ts_project';

export const TS_PROJECTS = TsProject.loadAll({
  /** Array of repo-relative paths to projects which should be ignored and not treated as a TS project in the repo */
  ignore: [
    '**/__fixtures__/**/*',
    // Every @kbn/ui-* package has a packaging build tsconfig used only for
    // standalone build-time type validation; it intentionally imports from
    // parent directories and conflicts with the package's main tsconfig.
    // See e.g. `src/platform/kbn-ui/side-navigation/packaging/react/type_validation.ts`.
    'src/platform/kbn-ui/*/packaging/tsconfig.json',
  ],

  /** Array of repo-relative paths to projects which should have their type-check disabled */
  disableTypeCheck: [
    // this directory has additionally dependencies which scripts/type_check can't guarantee
    // are present or up-to-date, and users likely won't know how to manage either, so the
    // type check is explicitly disabled in this project for now
    '.buildkite/tsconfig.json',
    // Each @kbn/ui-* package's `packaging/example/` is a demo app whose
    // tsconfig doesn't fit the repo-wide project graph — its imports reach
    // into the package source (outside the example's rootDir), and its
    // compiler options (`strict: false`, ESNext modules) differ from the
    // main package. The example is driven by its own webpack config; we
    // keep its tsconfig registered here so `ts_projects.sh` recognizes
    // the `.tsx` files as belonging to a project, but skip running tsc.
    'src/platform/kbn-ui/*/packaging/example/tsconfig.json',
  ],
});
