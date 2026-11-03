/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The parts of the package that do not need the connector specs. `index.ts` re-exports every spec
 * (and their drivers), which a runtime that only executes connectors, like a task pod, should not
 * load for a few constants.
 */
export { EARS_AUTH_ID, EARS_PROVIDERS } from './src/auth_types/ears';
export { RELAY_AUTH_ID } from './src/auth_types/relay';
export { OAUTH_AUTHORIZATION_CODE_AUTH_ID } from './src/auth_types/oauth_authorization_code';
export { CLIENT_ASSERTION_TYPE } from './src/auth_types/oauth_client_credentials_private_key_jwt';
export { normalizeAuthorizationHeaderValue } from './src/auth_types/oauth_authz_code_and_ears_helpers';
export { ConnectorAuthorizationError, isConnectorAuthorizationError } from './src/errors';
export type { ConnectorAuthorizationReason } from './src/errors';
export {
  getAuthModeForAuthTypeId,
  authTypeUsesRelay,
  isKibanaManagedAuthTypeId,
} from './src/auth_mode_by_auth_type_id';
export { connectorSpecHasEvents } from './src/spec_has_events';
