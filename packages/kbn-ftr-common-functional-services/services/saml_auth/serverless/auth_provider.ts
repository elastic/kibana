/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
]);

const getDefaultServerlessRole = (projectType: string) => {
  if (projectDefaultRoles.has(projectType)) {
    return projectDefaultRoles.get(projectType)!;
  } else {
    throw new Error(`Default role is not defined for ${projectType} project`);
  }
};

export class ServerlessAuthProvider implements AuthProvider {
  private readonly projectType: string;
  private readonly rolesDefinitionPath: string;

  constructor(config: Config) {
    const kbnServerArgs = config.get('kbnTestServer.serverArgs') as string[];
    this.projectType = kbnServerArgs.reduce((acc, arg) => {
      const match = arg.match(/--serverless[=\s](\w+)/);
      return acc + (match ? match[1] : '');
    }, '') as ServerlessProjectType;

    if (!isServerlessProjectType(this.projectType)) {
      throw new Error(`Unsupported serverless projectType: ${this.projectType}`);
    }

    this.rolesDefinitionPath = resolve(SERVERLESS_ROLES_ROOT_PATH, this.projectType, 'roles.yml');
  }

  getSupportedRoleDescriptors(): Record<string, unknown> {
    return readRolesDescriptorsFromResource(this.rolesDefinitionPath) as Record<string, unknown>;
  }
  getDefaultRole(): string {
    return getDefaultServerlessRole(this.projectType);
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
