/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import { SecretsApiActions } from '../../common/constants';

/**
 * Security configuration objects ready to be used in route definitions
 */
export const SECRET_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [SecretsApiActions.read] },
};
export const SECRET_CREATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [SecretsApiActions.create] },
};
export const SECRET_UPDATE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [SecretsApiActions.update] },
};
export const SECRET_DELETE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [SecretsApiActions.delete] },
};
