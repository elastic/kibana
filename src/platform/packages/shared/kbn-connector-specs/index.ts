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
export {
  EARS_AUTH_ID,
  EARS_PROVIDERS,
  RELAY_AUTH_ID,
  OAUTH_AUTHORIZATION_CODE_AUTH_ID,
  CERTIFICATE_BINDING_KINDS,
  CLIENT_ASSERTION_TYPE,
  JWT_ALGORITHMS,
  OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
  type CertificateBindingKind,
  type JwtAlgorithm,
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
  TEST_CONNECTOR_SUB_ACTION,
  MAX_CONNECTOR_TYPE_ID_LENGTH,
  AUTH_MODE_BY_AUTH_TYPE_ID,
  getAuthModeForAuthTypeId,
  USES_RELAY_BY_AUTH_TYPE_ID,
  authTypeUsesRelay,
  isKibanaManagedAuthTypeId,
  getMeta,
  setMeta,
  addMeta,
  type BaseMetadata,
} from '@kbn/connector-specs-common';

export { getConnectorSpec } from './src/get_connector_spec';
export {
  connectorSpecHasEvents,
  connectorTypeHasInboundEvents,
} from './src/connector_spec_has_events';
export { isInboundOnlyConnectorSpec } from './src/is_inbound_only_connector_spec';
export { ingestTokenHashSchema } from './src/ingest_token_hash_schema';
export { isToolAction } from './src/connector_spec';
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
