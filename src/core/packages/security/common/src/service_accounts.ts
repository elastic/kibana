/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Identifies a principal that is allowed to exchange a service account's
 * credentials for an access token.
 *
 * @public
 */
export interface ServiceAccountAssumableBy {
  type: 'project-service-account';
  organization_id: string;
  project_type: string;
  project_id: string;
}

/**
 * Roles granted to a service account, referenced by name and resolved at
 * execution time.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): the upstream API
 * specification does not pin down this structure, and the endpoint that
 * consumes it has not been implemented yet. Modelled loosely on purpose;
 * tighten it once the specification is confirmed.
 *
 * @public
 */
export type ServiceAccountRoleAssignments = Record<string, unknown>;

/**
 * Parameters for creating a service account.
 *
 * @public
 */
export interface CreateServiceAccountParams {
  name: string;
  role_assignments: ServiceAccountRoleAssignments;
}

/**
 * The response of exchanging a service account ID for an ephemeral access token.
 *
 * @public
 */
export interface ExchangeServiceAccountTokenResponse {
  /** The ephemeral access token. Short-lived and not intended to be cached or reused. */
  token: string;
}

/**
 * A service account.
 *
 * @public
 */
export interface ServiceAccount {
  id: string;
  type: 'project';
  name: string;
  organization_id: string;
  role_assignments: ServiceAccountRoleAssignments;
  assumable_by: ServiceAccountAssumableBy[];
}
