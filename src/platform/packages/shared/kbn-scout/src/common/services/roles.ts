/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerlessProjectType } from '@kbn/es';
import type { Role } from '@kbn/test/src/auth/types';
import { PROJECT_DEFAULT_ROLES } from '../constants';

/**
 * Resolves the privileged (non-admin, elevated) role name based on the deployment environment.
 * Returns `'developer'` for serverless Elasticsearch projects, `'editor'` for all others.
 */
export function getPrivilegedRoleName(config: {
  serverless: boolean;
  projectType: ServerlessProjectType;
}): Role {
  if (!config.serverless) {
    return 'editor';
  }

  const roleName = PROJECT_DEFAULT_ROLES.get(config.projectType);

  if (!roleName) {
    throw new Error(
      `No default privileged role defined for serverless project type: '${config.projectType}'. ` +
        `Expected one of: ${[...PROJECT_DEFAULT_ROLES.keys()].join(', ')}`
    );
  }

  return roleName;
}
