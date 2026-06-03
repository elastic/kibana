/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TerraformApi } from './load_terraform_apis';

/**
 * Converts a terraform API path like `/api/actions/connector/{id}` into a
 * safe regex fragment: `/api/actions/connector/[^/]+`.
 *
 * Only alphanumeric characters, `/`, `_`, and `-` are kept as literals.
 * Path parameters (`{...}`) are replaced with `[^/]+`.
 * Any other characters are escaped to avoid unintended regex behavior.
 */
const pathToPattern = (apiPath: string): string =>
  apiPath.replace(/\{[^{}]+\}/g, '[^/]+').replace(/[^a-zA-Z0-9/_\-[\]^+]/g, '\\$&');

/**
 * Builds an oasdiff `--match-path` regex string from terraform API paths.
 * Returns `undefined` when there are no paths to match.
 */
export const buildMatchPath = (apis: TerraformApi[]): string | undefined => {
  if (apis.length === 0) {
    return undefined;
  }

  const uniquePaths = [...new Set(apis.map((api) => api.path))];
  return uniquePaths.map(pathToPattern).join('|');
};
