/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Max length for `ConnectorSpec.metadata.id` (action / connector type id, e.g. `.slack2`).
 * Distinct from Actions saved-object connector instance ids (`CONNECTOR_ID_MAX_LENGTH` = 36).
 */
export const MAX_CONNECTOR_TYPE_ID_LENGTH = 64;

/** Bound echoed challenge so a handshake cannot become an unbounded response. */
export const MAX_HANDSHAKE_CHALLENGE_LENGTH = 1024;

export const TEST_CONNECTOR_SUB_ACTION = '_test';

export const INBOUND_WEBHOOK_CONNECTOR_TYPE_ID = '.inboundWebhook' as const;

export const EARS_AUTH_ID = 'ears';
export const EARS_PROVIDERS = ['google', 'microsoft', 'slack'] as const;

export const RELAY_AUTH_ID = 'relay';

export const OAUTH_AUTHORIZATION_CODE_AUTH_ID = 'oauth_authorization_code';

export const OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID =
  'oauth_client_credentials_private_key_jwt';
export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

export const JWT_ALGORITHMS = ['PS256', 'RS256', 'ES256'] as const;
export type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];

export const CERTIFICATE_BINDING_KINDS = ['x5t#S256', 'x5c', 'kid'] as const;
export type CertificateBindingKind = (typeof CERTIFICATE_BINDING_KINDS)[number];
