/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// oxlint resolves `files`, `ignorePatterns`, and `jsPlugins` paths relative to this file, so
// the entry must stay at the repo root. The typed config lives in `.oxlint/`, which has its
// own tsconfig.json; this entry is JS so the root TS project does not have to include it.
export { default } from './.oxlint/index.mts';
