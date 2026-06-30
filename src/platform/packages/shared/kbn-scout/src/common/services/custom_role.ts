/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsClient, KbnClient } from '.';

export interface KibanaRole {
  elasticsearch: {
    cluster: string[];
    indices?: Array<{
      names: string[];
      privileges: string[];
      allow_restricted_indices?: boolean | undefined;
    }>;
  };
  kibana: Array<{
    base: string[];
    feature: Record<string, string[]>;
    spaces: string[];
  }>;
}

export interface ElasticsearchRoleDescriptor {
  cluster?: string[];
  indices?: Array<{
    names: string[];
    privileges: string[];
    allow_restricted_indices?: boolean;
  }>;
  applications?: Array<{
    application: string;
    privileges: string[];
    resources: string[];
  }>;
  run_as?: string[];
}

export const createCustomRole = async (
  kbnClient: KbnClient,
  customRoleName: string,
  role: KibanaRole
) => {
  const { status } = await kbnClient.request({
    method: 'PUT',
    path: `/api/security/role/${customRoleName}`,
    body: role,
  });

  if (status !== 204) {
    throw new Error(`Failed to set custom role with status: ${status}`);
  }
};

export const createElasticsearchCustomRole = async (
  client: EsClient,
  customRoleName: string,
  role: ElasticsearchRoleDescriptor
) => {
  await client.security.putRole({
    name: customRoleName,
    ...role,
  });
  // ES caches role lookups and realm-mapped role assignments separately.
  // Without invalidating both, a freshly-created role can resolve to "not found"
  // for users whose SAML session predates the previous cache miss — leaving the
  // user with empty effective roles even though the role exists in .security.
  await Promise.all([
    client.security.clearCachedRoles({ name: customRoleName }),
    client.security.clearCachedRealms({ realms: '*' }),
  ]);
};

export const isElasticsearchRole = (
  role: KibanaRole | ElasticsearchRoleDescriptor
): role is ElasticsearchRoleDescriptor => {
  return !(role && 'kibana' in role);
};
