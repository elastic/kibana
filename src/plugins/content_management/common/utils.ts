/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** Utility to validate that a content version follows the pattern `v${number}` */
export const validateVersion = (version: unknown): number => {
  if (typeof version !== 'string') {
    throw new Error(`Invalid version [${version}]. Must follow the pattern [v$\{number\}]`);
  }

  if (/^v\d+$/.test(version) === false) {
    throw new Error(`Invalid version [${version}]. Must follow the pattern [v$\{number\}]`);
  }

  const versionNumber = parseInt(version.substring(1), 10);

  if (versionNumber < 1) {
    throw new Error(`Version must be >= 1`);
  }

  return versionNumber;
};
