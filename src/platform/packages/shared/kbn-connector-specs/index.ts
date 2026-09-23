/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * as connectorsSpecs from './src/all_specs';
export type * from './src/connector_spec';
export type { ConnectorActionErrorMeta } from './src/connector_utils';
export * as authTypeSpecs from './src/all_auth_types';
export { EARS_AUTH_ID, EARS_PROVIDERS } from './src/auth_types/ears';
export { RELAY_AUTH_ID } from './src/auth_types/relay';
export { OAUTH_AUTHORIZATION_CODE_AUTH_ID } from './src/auth_types/oauth_authorization_code';
export {
  CERTIFICATE_BINDING_KINDS,
  CLIENT_ASSERTION_TYPE,
  JWT_ALGORITHMS,
  OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
  type CertificateBindingKind,
  type JwtAlgorithm,
} from './src/auth_types/oauth_client_credentials_private_key_jwt';

export { getConnectorSpec } from './src/get_connector_spec';
export {
  connectorSpecHasEvents,
  connectorTypeHasInboundEvents,
} from './src/connector_spec_has_events';
export { isInboundOnlyConnectorSpec } from './src/is_inbound_only_connector_spec';
export { ingestTokenHashSchema } from './src/ingest_token_hash_schema';
export {
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
} from './src/specs/inbound_webhook/constants';
export { isToolAction, TEST_CONNECTOR_SUB_ACTION } from './src/connector_spec';
export type {
  ConnectorIngressContext,
  EventDefinition,
  EventPayload,
  HandleEventsHttpResponse,
  HandleEventsResult,
  ConnectorSpecEvents,
} from './src/connector_spec_events';
export {
  handleEventsResultSchema,
  isJsonSerializableSpokeBody,
  parseHandleEventsResult,
  MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH,
  MAX_HANDLE_EVENTS_EVENT_ID_LENGTH,
  MAX_HANDLE_EVENTS_EVENTS,
  MAX_HANDLE_EVENTS_EVENTS_LIMIT,
  MAX_HANDLE_EVENTS_HEADERS,
  MAX_HANDLE_EVENTS_HEADER_NAME_LENGTH,
  MAX_HANDLE_EVENTS_HEADER_VALUE_LENGTH,
  MAX_HANDLE_EVENTS_HTTP_BODY_BYTES,
  MAX_HANDLE_EVENTS_PAYLOAD_BYTES,
  MAX_HANDLE_EVENTS_PAYLOAD_KEY_LENGTH,
  MAX_HANDLE_EVENTS_PAYLOAD_KEYS,
} from './src/handle_events_result';
export type { ParseHandleEventsLimits } from './src/handle_events_result';
export {
  buildEventId,
  connectorTypeToEventNamespace,
  normalizeConnectorTypeId,
  MAX_CONNECTOR_TYPE_ID_LENGTH,
} from './src/event_type_id';
export {
  validateEmittedEvents,
  type ValidateEmittedEventsError,
  type ValidateEmittedEventsResult,
} from './src/validate_emitted_events';
export {
  getConnectorActionErrorMeta,
  setConnectorActionErrorMeta,
  getFinitePositiveNumber,
  getEstimatedBase64OutputBytes,
  getHeaderValue,
  getResponseContentLengthBytes,
  ESTIMATED_JSON_OUTPUT_OVERHEAD_BYTES,
} from './src/connector_utils';
export { normalizeAuthorizationHeaderValue } from './src/auth_types/oauth_authz_code_and_ears_helpers';
export { isEarsExperimentalConnector } from './src/lib/ears_experimental_utils';

export { ConnectorAuthorizationError, isConnectorAuthorizationError } from './src/errors';
export type { ConnectorAuthorizationReason } from './src/errors';
export {
  AUTH_MODE_BY_AUTH_TYPE_ID,
  getAuthModeForAuthTypeId,
  USES_RELAY_BY_AUTH_TYPE_ID,
  authTypeUsesRelay,
  isKibanaManagedAuthTypeId,
} from './src/auth_mode_by_auth_type_id';
export { getMeta, setMeta, addMeta } from './src/connector_spec_ui';
export type { BaseMetadata } from './src/connector_spec_ui';
export { clientTypes } from './src/lib/clients';
export type {
  ClientTypeSpec,
  BuildContext,
  ConnectorNetworkSettings,
  ConnectorResponseSettings,
  CredentialAccessor,
  ClientRegistry,
  ClientTypeId,
  ClientTypeSpecs,
} from './src/lib/clients';
