/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';

/** Checks whether the authenticated caller has the reserved superuser role. */
export const isEntityAccessControlAdmin = (
  core: Pick<CoreStart, 'security'>,
  request?: KibanaRequest
): boolean => {
  if (!request) return false;
  const user = core.security.authc.getCurrentUser(request);
  return user?.roles?.includes('superuser') === true && user.authentication_type !== 'api_key';
};
