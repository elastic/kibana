/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SECRETS_FEATURE_ID = 'secrets';

// The API actions added by feature privileges, to be checked in the API routes.
// Api actions are not scoped by feature ID, so we scope it by adding the feature ID ("secrets") as prefix.
// example: security.authz.requiredPrivileges: ["secrets:create"]
export enum SecretsApiActions {
  'create' = `${SECRETS_FEATURE_ID}:create`,
  'read' = `${SECRETS_FEATURE_ID}:read`,
  'update' = `${SECRETS_FEATURE_ID}:update`,
  'delete' = `${SECRETS_FEATURE_ID}:delete`,
}
