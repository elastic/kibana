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
    // The packaging build tsconfig for one-navigation is used only for standalone
    // build-time type validation and intentionally imports from parent directories,
    // which conflicts with the main package tsconfig.
    // See: `src/core/packages/chrome/navigation/packaging/react/type_validation.ts`.
    'src/core/packages/chrome/navigation/packaging/tsconfig.json',
  ],

  /** Array of repo-relative paths to projects which should have their type-check disabled */
  disableTypeCheck: [
    // this directory has additionally dependencies which scripts/type_check can't guarantee
    // are present or up-to-date, and users likely won't know how to manage either, so the
    // type check is explicitly disabled in this project for now
    '.buildkite/tsconfig.json',
  ],
});
