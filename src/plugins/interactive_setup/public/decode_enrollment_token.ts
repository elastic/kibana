/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EnrollmentToken } from '../common/types';

export function decodeEnrollmentToken(enrollmentToken: string) {
  try {
    return JSON.parse(atob(enrollmentToken)) as EnrollmentToken;
  } catch (error) {} // eslint-disable-line no-empty
}
