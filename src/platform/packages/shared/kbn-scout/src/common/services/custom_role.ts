/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClient } from '@kbn/test';

export interface Role {
  elasticsearch: {
    cluster: string[];
    indices: Array<{
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

export interface RoleDescriptor {
  cluster?: string[];
  indices?: Array<{
    names: string[];
    privileges: string[];
    allow_restricted_indices?: boolean;
  }>;
  applications?: Array<{
    application: string;
    privileges: string[];
    resources: string;
  }>;
}

export class CustomRoleManager {
  private static instance: CustomRoleManager;
  private roleHashes: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): CustomRoleManager {
    if (!CustomRoleManager.instance) {
      CustomRoleManager.instance = new CustomRoleManager();
    }
    return CustomRoleManager.instance;
  }

  private hashRole(role: Role): string {
    return JSON.stringify(role);
  }

  async ensureRoleExists(roleName: string, role: Role, kbnClient: KbnClient): Promise<void> {
    const newRoleHash = this.hashRole(role);

    if (this.roleHashes.get(roleName) === newRoleHash) {
      return;
    }

    const { status } = await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${roleName}`,
      body: role,
    });

    if (status !== 204) {
      throw new Error(`Failed to set custom role with status: ${status}`);
    }

    this.roleHashes.set(roleName, newRoleHash);
  }
}

export const transformRoleDescriptorToKibanaRole = (roleDescriptor: RoleDescriptor): Role => {
  const applications = roleDescriptor.applications;
  const feature: Record<string, string[]> = {};

  if (applications && applications[0].application === 'kibana-.kibana') {
    const kibanaAppDescriptor = applications[0] as {
      application: string;
      privileges: string[];
      resources: string;
    };

    for (const privilege of kibanaAppDescriptor.privileges) {
      const [app, role] = privilege.replace('feature_', '').split('.');
      feature[app] = [...(feature[app] || []), role];
    }
  }

  return {
    elasticsearch: {
      cluster: roleDescriptor.cluster || [],
      indices: roleDescriptor.indices || [],
    },
    kibana: [
      {
        base: [],
        feature,
        spaces: ['*'],
      },
    ],
  } as Role;
};
