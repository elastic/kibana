/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readRolesDescriptorsFromResource, STATEFUL_ROLES_ROOT_PATH } from '@kbn/es';
import { resolve } from 'path';
import { RoleProvider } from './role_provider';

export class StatefulRoleProvider implements RoleProvider {
  getSupportedRoleDescriptors(): any {
    return readRolesDescriptorsFromResource(resolve(STATEFUL_ROLES_ROOT_PATH, 'roles.yml'));
  }
  getDefaultRole(): string {
    return 'editor';
  }
}
