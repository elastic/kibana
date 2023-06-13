/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const INTERNAL_VERSION_REGEX = /^[1-9][0-9]*$/;

/**
 * For public routes we must check that the version is a string that is YYYY-MM-DD.
 * For internal routes we must check that the version is a number.
 * @internal
 */
export function isValidRouteVersion(isPublicApi: boolean, version: string): undefined | string {
  /**
   * Public routes should be of the form YYYY-MM-DD and be a valid date. Because we only allow a single public version
   * at this time we keep this check simple.
   */
  if (isPublicApi) {
    if ('2023-10-31' !== version) {
      return 'Invalid version, for now please use "2023-10-31" as the version for all public routes.';
    }
    return;
  }
  return INTERNAL_VERSION_REGEX.test(version) && version !== '0'
    ? undefined
    : `Invalid version number. Received "${version}", expected a string containing _only_ a finite, whole number greater than 0.`;
}
