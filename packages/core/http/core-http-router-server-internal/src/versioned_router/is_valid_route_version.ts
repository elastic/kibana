/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

const PUBLIC_VERSION_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const INTERNAL_VERSION_REGEX = /^[0-9]+$/;

/**
 * For public routes we must check that the version is a string that is YYYY-MM-DD.
 * For internal routes we must check that the version is a number.
 * @internal
 */
export function isValidRouteVersion(isPublicApi: boolean, version: string): undefined | string {
  if (isPublicApi) {
    return PUBLIC_VERSION_REGEX.test(version) && moment(version, 'YYYY-MM-DD').isValid()
      ? undefined
      : `Invalid version. Received "${version}", expected a valid date string formatted as YYYY-MM-DD.`;
  }
  return INTERNAL_VERSION_REGEX.test(version) && version !== '0'
    ? undefined
    : `Invalid version number. Received "${version}", expected a string containing _only_ a finite, whole number greater than 0.`;
}
