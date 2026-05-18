/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthMode } from './connector_spec';
import * as allAuthTypes from './all_auth_types';

function isAuthTypeSpecEntry(value: unknown): value is { id: string; authMode?: AuthMode } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'string'
  );
}

export const AUTH_MODE_BY_AUTH_TYPE_ID: Record<string, AuthMode> = Object.fromEntries(
  Object.values(allAuthTypes)
    .filter(isAuthTypeSpecEntry)
    .map((spec) => [spec.id, spec.authMode ?? 'shared'])
) as Record<string, AuthMode>;

export function getAuthModeForAuthTypeId(authTypeId: string): AuthMode {
  return AUTH_MODE_BY_AUTH_TYPE_ID[authTypeId] ?? 'shared';
}
