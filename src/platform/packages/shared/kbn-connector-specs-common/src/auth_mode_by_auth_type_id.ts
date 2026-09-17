/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthMode } from './auth_mode';
import {
  EARS_AUTH_ID,
  OAUTH_AUTHORIZATION_CODE_AUTH_ID,
  OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
  RELAY_AUTH_ID,
} from './constants';

interface AuthTypeModeEntry {
  id: string;
  authMode?: AuthMode;
  usesRelayTransport?: boolean;
  isKibanaManaged?: boolean;
}

/**
 * Static auth-type metadata. Kept independent of auth `configure` implementations so
 * browser code can look up mode/relay/managed flags without loading server specs.
 */
const AUTH_TYPE_MODE_ENTRIES: readonly AuthTypeModeEntry[] = [
  { id: 'api_key_header' },
  { id: 'api_key_header_with_tls' },
  { id: 'api_key_query' },
  { id: 'azure_shared_key' },
  { id: 'aws_credentials' },
  { id: 'bearer' },
  { id: 'bearer_with_tls' },
  { id: 'basic' },
  { id: 'gcp_service_account' },
  { id: 'none' },
  { id: 'oauth_client_credentials' },
  { id: OAUTH_AUTHORIZATION_CODE_AUTH_ID, authMode: 'per-user' },
  { id: OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID },
  { id: EARS_AUTH_ID, authMode: 'per-user' },
  { id: RELAY_AUTH_ID, authMode: 'shared', usesRelayTransport: true, isKibanaManaged: true },
  { id: 'kubernetes_gke' },
  { id: 'kubernetes_eks' },
  { id: 'kubernetes_aks' },
];

export const AUTH_MODE_BY_AUTH_TYPE_ID: Record<string, AuthMode> = Object.fromEntries(
  AUTH_TYPE_MODE_ENTRIES.map((spec) => [spec.id, spec.authMode ?? 'shared'])
) as Record<string, AuthMode>;

export function getAuthModeForAuthTypeId(authTypeId: string): AuthMode {
  return AUTH_MODE_BY_AUTH_TYPE_ID[authTypeId] ?? 'shared';
}

export const USES_RELAY_BY_AUTH_TYPE_ID: Record<string, boolean> = Object.fromEntries(
  AUTH_TYPE_MODE_ENTRIES.map((spec) => [spec.id, spec.usesRelayTransport ?? false])
) as Record<string, boolean>;

export function authTypeUsesRelay(authTypeId: string): boolean {
  return USES_RELAY_BY_AUTH_TYPE_ID[authTypeId] ?? false;
}

export const IS_KIBANA_MANAGED_BY_AUTH_TYPE_ID: Record<string, boolean> = Object.fromEntries(
  AUTH_TYPE_MODE_ENTRIES.map((spec) => [spec.id, spec.isKibanaManaged ?? false])
) as Record<string, boolean>;

export function isKibanaManagedAuthTypeId(authTypeId: string): boolean {
  return IS_KIBANA_MANAGED_BY_AUTH_TYPE_ID[authTypeId] ?? false;
}
