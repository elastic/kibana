/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface SerializedUser {
  username: string;
  roles: readonly string[];
  profile_uid?: string;
  authentication_realm?: { name: string; type: string };
  lookup_realm?: { name: string; type: string };
  authentication_provider?: { type: string; name: string };
  authentication_type?: string;
  http_authentication_scheme?: string;
  elastic_cloud_user?: boolean;
}

export interface JobLastRun {
  at: string;
  you: SerializedUser | null;
  scoped: {
    kibanaUser: SerializedUser | null;
    esAuthenticate: unknown;
    esAuthenticateError?: string;
    error?: string;
  };
}

export interface JobBindingSummary {
  serviceAccountId: string;
  spaceId: string;
  attachedAt: string;
  attachedBy: unknown;
}

export interface ExampleJob {
  id: string;
  title: string;
  description?: string;
  lastRun?: JobLastRun;
  binding: JobBindingSummary | null;
}

export interface StatusResponse {
  operationType: string;
  workloadType: string;
  isEnabled: boolean;
  spaceId: string;
}

export interface ServiceAccountCreator {
  type: 'user' | 'api-key';
  id: string;
  first_name?: string;
  last_name?: string;
  description?: string;
}

export interface ServiceAccountAssumableBy {
  type: string;
  organization_id?: string;
  project_type?: string;
  project_id?: string;
}

export interface RetrievedServiceAccount {
  id: string;
  type: 'project';
  name: string;
  organization_id: string;
  role_assignments: Record<string, unknown>;
  assumable_by: ServiceAccountAssumableBy[];
  creator: ServiceAccountCreator;
}

export interface ListServiceAccountsResponse {
  service_accounts: RetrievedServiceAccount[];
  after?: string;
}
