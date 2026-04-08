/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Represents a client logo provided as a URL.
 */
export interface UiamOAuthClientLogoUrl {
  type: 'url';
  url: string;
}

/**
 * Represents a client logo provided as base64-encoded image data.
 */
export interface UiamOAuthClientLogoBase64 {
  type: 'base64';
  media_type: string;
  data: string;
}

export type UiamOAuthClientLogo = UiamOAuthClientLogoUrl | UiamOAuthClientLogoBase64;

/**
 * Represents a single OAuth client returned by the UIAM service.
 */
export interface UiamOAuthClientResponse {
  id: string;
  client_name?: string;
  resource: string;
  type?: string;
  creation?: string;
  revoked?: boolean;
  revocation?: string;
  revocation_reason?: string;
  client_metadata?: Record<string, string>;
  client_logo?: UiamOAuthClientLogo;
  connections?: { active?: string[]; revoked?: string[] };
}

/**
 * Represents a single OAuth connection returned by the UIAM service.
 */
export interface UiamOAuthConnectionResponse {
  id: string;
  client_id: string;
  resource: string;
  creation?: string;
  revoked?: boolean;
  revocation?: string;
  revocation_reason?: string;
  scopes?: string[];
}

/**
 * Parameters for creating an OAuth client.
 */
export interface CreateUiamOAuthClientParams {
  resource: string;
  client_name?: string;
  client_metadata?: Record<string, string>;
  client_logo?: UiamOAuthClientLogo;
}

/**
 * Parameters for updating an OAuth client.
 */
export interface UpdateUiamOAuthClientParams {
  client_name?: string | null;
  client_metadata?: Record<string, string>;
  client_logo?: UiamOAuthClientLogo | null;
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
