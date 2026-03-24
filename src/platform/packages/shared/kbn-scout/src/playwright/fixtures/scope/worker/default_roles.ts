/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  readRolesDescriptorsFromResource,
} from '@kbn/es';
import type { ElasticsearchRoleDescriptor } from '../../../../common';
import { coreWorkerFixtures } from './core_fixtures';

export interface DefaultRolesFixture {
  availableRoles: Map<string, ElasticsearchRoleDescriptor>;
  rolesFilePath: string;
}

/**
 * Provides role descriptors for default roles.
 * Uses worker scope to ensure the file is read only once per worker.
 */
export const defaultRolesFixture = coreWorkerFixtures.extend<
  {},
  { defaultRoles: DefaultRolesFixture }
>({
  defaultRoles: [
    async ({ log, config }, use) => {
      // TODO: Add support for serverless projects with different tiers
      // ref https://github.com/elastic/kibana/pull/229919
      const resourcePath = config.serverless
        ? `${SERVERLESS_ROLES_ROOT_PATH}/${config.projectType!}/roles.yml`
        : `${STATEFUL_ROLES_ROOT_PATH}/roles.yml`;

      const rolesDescriptors = readRolesDescriptorsFromResource(resourcePath) as Record<
        string,
        ElasticsearchRoleDescriptor
      >;

      const data = new Map<string, ElasticsearchRoleDescriptor>(Object.entries(rolesDescriptors));

      log.serviceLoaded('defaultRoles');
      await use({ availableRoles: data, rolesFilePath: resourcePath });
    },
    { scope: 'worker' },
  ],
});
