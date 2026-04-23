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
    // Every @kbn/ui-* package ships a `packaging/` subtree with its own
    // tsconfig(s) — the packaging build tsconfig for type validation, and
    // an `example/tsconfig.json` for the demo app that expects the built
    // tarball as its import source. Both reach outside the repo-wide
    // project graph and must be excluded from the full type check.
    // See e.g. `src/platform/kbn-ui/side-navigation/packaging/react/type_validation.ts`.
    'src/platform/kbn-ui/*/packaging/**/tsconfig.json',
  ],

  /** Array of repo-relative paths to projects which should have their type-check disabled */
  disableTypeCheck: [
    // this directory has additionally dependencies which scripts/type_check can't guarantee
    // are present or up-to-date, and users likely won't know how to manage either, so the
    // type check is explicitly disabled in this project for now
    '.buildkite/tsconfig.json',
  ],
});
