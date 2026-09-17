/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { AuthMode } from './src/auth_mode';
export type { ConnectorMetadata } from './src/connector_metadata';
export type { ConnectorIconProps } from './src/types';
export type { BaseMetadata } from './src/connector_spec_ui';
export type { ConnectorZodSchema } from './src/deserialize_connector_spec';
export type { CertificateBindingKind, JwtAlgorithm } from './src/constants';

export { WidgetType, getMeta, setMeta, addMeta, UISchemas } from './src/connector_spec_ui';
export { fromConnectorSpecSchema } from './src/deserialize_connector_spec';
export { narrowSecretsSchemaForAuthMode } from './src/narrow_secrets_schema_for_auth_mode';
export {
  AUTH_MODE_BY_AUTH_TYPE_ID,
  getAuthModeForAuthTypeId,
  USES_RELAY_BY_AUTH_TYPE_ID,
  authTypeUsesRelay,
  IS_KIBANA_MANAGED_BY_AUTH_TYPE_ID,
  isKibanaManagedAuthTypeId,
} from './src/auth_mode_by_auth_type_id';
export { ConnectorIconsMap } from './src/connector_icons_map';
export { useBrandFill, createBrandIcon } from './src/brand_icon';
export {
  MAX_CONNECTOR_TYPE_ID_LENGTH,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
  TEST_CONNECTOR_SUB_ACTION,
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  EARS_AUTH_ID,
  EARS_PROVIDERS,
  RELAY_AUTH_ID,
  OAUTH_AUTHORIZATION_CODE_AUTH_ID,
  OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
  CLIENT_ASSERTION_TYPE,
  JWT_ALGORITHMS,
  CERTIFICATE_BINDING_KINDS,
} from './src/constants';
