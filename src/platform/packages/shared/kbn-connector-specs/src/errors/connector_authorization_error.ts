/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isError } from 'lodash';

export type ConnectorAuthorizationReason =
  | 'no_token'
  | 'token_expired'
  | 'refresh_token_expired'
  | 'token_revoked'
  | 'refresh_failed';

/**
 * Structured error thrown when a connector fails to authorize, and should
 * specifically be used to signal that the connector requires user re-authorization.
 */
export class ConnectorAuthorizationError extends Error {
  public readonly authMethod: string;
  public readonly reason: ConnectorAuthorizationReason;

  constructor({
    authMethod,
    reason,
    message,
  }: {
    authMethod: string;
    reason: ConnectorAuthorizationReason;
    message: string;
  }) {
    super(message);
    this.name = 'ConnectorAuthorizationError';
    this.authMethod = authMethod;
    this.reason = reason;
  }
}

export const isConnectorAuthorizationError = (
  error: unknown
): error is ConnectorAuthorizationError => {
  return (
    error instanceof ConnectorAuthorizationError ||
    (isError(error) && error.name === 'ConnectorAuthorizationError')
  );
};
