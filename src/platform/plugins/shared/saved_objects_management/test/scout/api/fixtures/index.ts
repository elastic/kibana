/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestAuthFixture, RoleApiCredentials } from '@kbn/scout';
import { apiTest as base } from '@kbn/scout';

export interface SomRequestAuthFixture extends RequestAuthFixture {
  getAdminApiKey: () => Promise<RoleApiCredentials>;
}

export interface SomApiFixtures {
  requestAuth: SomRequestAuthFixture;
}

export const apiTest = base.extend<SomApiFixtures>({
  requestAuth: async ({ requestAuth }, use) => {
    const getAdminApiKey = async (): Promise<RoleApiCredentials> => {
      return await requestAuth.getApiKeyForCustomRole({
        elasticsearch: {
          cluster: [],
          indices: [],
        },
        kibana: [
          {
            base: [],
            feature: {
              savedObjectsManagement: ['all'],
            },
            spaces: ['*'],
          },
        ],
      });
    };

    const extendedRequestAuth: SomRequestAuthFixture = {
      ...requestAuth,
      getAdminApiKey,
    };

    await use(extendedRequestAuth);
  },
});

export * as testData from './constants';
