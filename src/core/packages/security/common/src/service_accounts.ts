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
 * Roles granted to a service account, as resolved by UIAM and reported on a
 * service account. Creating one does not take role assignments: UIAM's first
 * iteration grants the service account the privileges of its creator, minus any
 * control plane privileges, so there is nothing for a caller to choose.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): modelled loosely
 * because the upstream API specification does not pin the structure down;
 * tighten it once it does.
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
}

/**
 * The principal that attached a service account to a workload. Always the most specific stable
 * identifier available for whatever actually acted: a machine identity, else the credential, else
 * the user.
 *
 * @public
 */
export type ServiceAccountWorkloadAttacher =
  | {
      type: 'user';
      username: string;
      userProfileId?: string;
    }
  | {
      type: 'api_key';
      apiKeyId: string;
      variant: 'stack' | 'uiam';
      userProfileId?: string;
    }
  | { type: 'service_account'; serviceAccountId: string };

/**
 * A persisted attachment of a service account to a workload of a registered operation type.
 *
 * @public
 */
export interface ServiceAccountWorkloadBinding {
  operationType: string;
  workloadType: string;
  workloadId: string;
  serviceAccountId: string;
  spaceId: string;
  attachedBy: ServiceAccountWorkloadAttacher;
  /** ISO-8601 timestamp of the attach. */
  attachedAt: string;
}

/**
 * Parameters for attaching a service account to a workload.
 *
 * @public
 */
export interface AttachServiceAccountWorkloadParams {
  serviceAccountId: string;
  /** Kind of workload within the operation, e.g. `rule` or `workflow`. */
  workloadType: string;
  workloadId: string;
}

/**
 * Identifies a workload whose binding is being read or executed. Workload IDs are not guaranteed
 * unique across spaces, so the space is part of a binding's identity.
 *
 * @public
 */
export interface ServiceAccountWorkloadCoordinates {
  workloadType: string;
  workloadId: string;
  /** Defaults to the default space. */
  spaceId?: string;
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
