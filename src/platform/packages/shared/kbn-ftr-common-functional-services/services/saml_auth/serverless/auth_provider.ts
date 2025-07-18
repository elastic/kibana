/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';
import { ServerlessProjectType, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { type Config } from '@kbn/test';
import { isServerlessProjectType, readRolesDescriptorsFromResource } from '@kbn/es/src/utils';
import { resolve } from 'path';
import { Role } from '@kbn/test/src/auth/types';
import {
  getServerlessInternalRequestHeaders,
  COMMON_REQUEST_HEADERS,
} from '../default_request_headers';
import { AuthProvider } from '../get_auth_provider';

const projectDefaultRoles = new Map<string, Role>([
  ['es', 'developer'],
  ['security', 'editor'],
  ['oblt', 'editor'],
  ['chat', 'developer'], // TODO: double check if it's really 'developer'
]);

const projectTypesWithCustomRolesEnabled = ['es', 'security', 'oblt'];

const getDefaultServerlessRole = (projectType: string) => {
  if (projectDefaultRoles.has(projectType)) {
    return projectDefaultRoles.get(projectType)!;
  } else {
    throw new Error(`Default role is not defined for ${projectType} project`);
  }
};

export class ServerlessAuthProvider implements AuthProvider {
  private readonly projectType: string;
  private readonly roleManagementEnabled: boolean;
  private readonly rolesDefinitionPath: string;

  constructor(config: Config) {
    const options = getopts(config.get('kbnTestServer.serverArgs'), {
      boolean: ['xpack.security.roleManagementEnabled'],
      default: {
        'xpack.security.roleManagementEnabled': true, // defaults to true if undefined
      },
    });
    this.projectType = options.serverless as ServerlessProjectType;

    // Indicates whether role management was not explicitly overridden using
    // the `--xpack.security.roleManagementEnabled=false` flag.
    this.roleManagementEnabled = options['xpack.security.roleManagementEnabled'];

    if (!isServerlessProjectType(this.projectType)) {
      throw new Error(`Unsupported serverless projectType: ${this.projectType}`);
    }

    this.rolesDefinitionPath = resolve(SERVERLESS_ROLES_ROOT_PATH, this.projectType, 'roles.yml');
  }

  isServerless(): boolean {
    return true;
  }

  getProjectType() {
    return this.projectType;
  }

  getSupportedRoleDescriptors() {
    const roleDescriptors = new Map<string, any>(
      Object.entries(
        readRolesDescriptorsFromResource(this.rolesDefinitionPath) as Record<string, unknown>
      )
    );
    // Adding custom role to the map without privileges, so it can be later updated and used in the tests
    if (this.isCustomRoleEnabled()) {
      roleDescriptors.set(this.getCustomRole(), null);
    }
    return roleDescriptors;
  }

  getDefaultRole(): string {
    return getDefaultServerlessRole(this.projectType);
  }

  isCustomRoleEnabled() {
    return (
      projectTypesWithCustomRolesEnabled.includes(this.projectType) || this.roleManagementEnabled
    );
  }

  // For compatibility with the Scout test framework we use the same name for the custom role
  getCustomRole() {
    return 'custom_role_worker_1';
  }

  getRolesDefinitionPath(): string {
    return this.rolesDefinitionPath;
  }

  getCommonRequestHeader() {
    return COMMON_REQUEST_HEADERS;
  }

  getInternalRequestHeader() {
    return getServerlessInternalRequestHeaders();
  }
}
