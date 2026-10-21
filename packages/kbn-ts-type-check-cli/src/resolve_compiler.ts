/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

/** tsrs: Rust port of the TypeScript 7 compiler, CLI-compatible with `tsc`. */
export const TYPE_CHECK_COMPILER_PACKAGE = 'tsrs';

/**
 * Resolves the absolute path to the `tsrs` compiler binary.
 *
 * The bin is not exposed through the package `exports` map, so resolve it
 * relative to the (exported) package.json.
 */
export const resolveTypeCheckCompiler = (): string => {
  const pkgJsonPath = require.resolve(`${TYPE_CHECK_COMPILER_PACKAGE}/package.json`);
  return Path.join(Path.dirname(pkgJsonPath), 'bin', 'tsrs');
};
