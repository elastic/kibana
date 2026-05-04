/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';

export interface UiamOAuthClientLogo {
  media_type: string;
  data: string;
}

export interface UiamOAuthConnectionsSummary {
  active?: string[];
  revoked?: string[];
}

export type UiamOAuthClientType = 'public' | 'confidential';

export interface UiamOAuthClientResponse {
  id: string;
  client_name?: string;
  client_secret?: string;
  resource: string;
  type?: UiamOAuthClientType;
  creation?: string;
  revoked?: boolean;
  revocation?: string;
  revocation_reason?: string;
  client_metadata?: Record<string, string>;
  client_logo?: UiamOAuthClientLogo;
  redirect_uris?: string[];
  connections?: UiamOAuthConnectionsSummary;
}

export interface UiamOAuthConnectionResponse {
  id: string;
  client_id: string;
  name?: string;
  resource: string;
  creation?: string;
  revoked?: boolean;
  revocation?: string;
  revocation_reason?: string;
  scopes?: string[];
}

export interface CreateUiamOAuthClientParams {
  resource: string;
  client_name?: string;
  client_type?: UiamOAuthClientType;
  client_metadata?: Record<string, string>;
  client_logo?: UiamOAuthClientLogo;
  redirect_uris?: string[];
}

export interface UpdateUiamOAuthClientParams {
  client_name?: string | null;
  client_metadata?: Record<string, string | null>;
  client_logo?: UiamOAuthClientLogo | null;
  redirect_uris?: string[];
}

export interface UpdateUiamOAuthConnectionParams {
  name: string;
}

/**
 * Interface for managing UIAM OAuth client and connection operations.
 */
export interface UiamOAuthType {
  /**
   * Creates an OAuth client.
   * @param request The Kibana request containing the authorization header.
   * @param params The parameters for creating the OAuth client.
   */
  createClient(
    request: KibanaRequest,
    params: CreateUiamOAuthClientParams
  ): Promise<UiamOAuthClientResponse | null>;

  /**
   * Lists OAuth clients, optionally filtered by client ID.
   * @param request The Kibana request containing the authorization header.
   * @param clientId Optional client ID filter.
   */
  listClients(
    request: KibanaRequest,
    clientId?: string
  ): Promise<{ clients: UiamOAuthClientResponse[] } | null>;

  /**
   * Updates an OAuth client's metadata.
   * @param request The Kibana request containing the authorization header.
   * @param clientId The ID of the client to update.
   * @param params The parameters for updating the OAuth client.
   */
  updateClient(
    request: KibanaRequest,
    clientId: string,
    params: UpdateUiamOAuthClientParams
  ): Promise<UiamOAuthClientResponse | null>;

  /**
   * Revokes an OAuth client.
   * @param request The Kibana request containing the authorization header.
   * @param clientId The ID of the client to revoke.
   * @param reason Optional reason for revocation.
   */
  revokeClient(
    request: KibanaRequest,
    clientId: string,
    reason?: string
  ): Promise<UiamOAuthClientResponse | null>;

  /**
   * Lists OAuth connections, optionally filtered by client ID and/or connection ID.
   * @param request The Kibana request containing the authorization header.
   * @param clientId Optional client ID filter.
   * @param connectionId Optional connection ID filter.
   */
  listConnections(
    request: KibanaRequest,
    clientId?: string,
    connectionId?: string
  ): Promise<{ connections: UiamOAuthConnectionResponse[] } | null>;

  /**
   * Updates an OAuth connection's display name.
   * @param request The Kibana request containing the authorization header.
   * @param clientId The ID of the client owning the connection.
   * @param connectionId The ID of the connection to update.
   * @param params The parameters for updating the OAuth connection.
   */
  updateConnection(
    request: KibanaRequest,
    clientId: string,
    connectionId: string,
    params: UpdateUiamOAuthConnectionParams
  ): Promise<UiamOAuthConnectionResponse | null>;

  /**
   * Revokes an OAuth connection.
   * @param request The Kibana request containing the authorization header.
   * @param clientId The ID of the client owning the connection.
   * @param connectionId The ID of the connection to revoke.
   * @param reason Optional reason for revocation.
   */
  revokeConnection(
    request: KibanaRequest,
    clientId: string,
    connectionId: string,
    reason?: string
  ): Promise<UiamOAuthConnectionResponse | null>;
}
