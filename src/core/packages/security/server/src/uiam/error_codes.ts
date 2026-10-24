/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** UIAM error codes that Kibana handles, named after UIAM's ErrorCode constants. */
export const UIAM_ERROR_CODES = {
  APIKEY_MISSING: '0x28D520',
  APIKEY_REVOKED: '0xD38358',
  TOKEN_EXPIRED: '0x7E0116',
  CREATE_SA_RESULTS_IN_NO_PRIVS: '0x138916',
  ALREADY_DOWNSCOPED: '0x91249F',
  CREATE_SA_SERVICE_ACCOUNT_NOT_SUPPORTED: '0x97E147',
  ORGANIZATION_SERVICE_ACCOUNT_NOT_FOUND: '0xEDF789',
  ORGANIZATION_SERVICE_ACCOUNT_REVOKED: '0x3B8626',
  AUTHZ_DENY: '0x93B121',
} as const;
