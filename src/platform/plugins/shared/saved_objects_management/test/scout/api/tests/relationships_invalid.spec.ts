/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { KBN_ARCHIVES, MANAGEMENT_API, SAVED_OBJECT_IDS } = testData;

const DEFAULT_TYPES = ['visualization', 'index-pattern', 'search', 'dashboard'];

function relationshipsUrl(type: string, id: string): string {
  const typesQuery = DEFAULT_TYPES.map((t) => `savedObjectTypes=${t}`).join('&');
  return `${MANAGEMENT_API.RELATIONSHIPS}/${type}/${id}?${typesQuery}`;
}

function sortRelations<T extends { relationship: string; type: string; id: string }>(
  relations: T[]
): T[] {
  return [...relations].sort((a, b) =>
    `${a.relationship}:${a.type}:${a.id}`.localeCompare(`${b.relationship}:${b.type}:${b.id}`)
  );
}

apiTest.describe('relationships - invalid references', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getAdminApiKey();
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.RELATIONSHIPS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.RELATIONSHIPS);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return the invalid relations', async ({ apiClient }) => {
    const response = await apiClient.get(relationshipsUrl('dashboard', 'invalid-refs'), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.invalidRelations).toStrictEqual([
      {
        error: 'Saved object [visualization/invalid-vis] not found',
        id: 'invalid-vis',
        relationship: 'child',
        type: 'visualization',
      },
    ]);

    expect(sortRelations(response.body.relations)).toMatchObject(
      sortRelations([
        {
          id: SAVED_OBJECT_IDS.VISUALIZATION_BASIC,
          meta: {
            icon: 'visualizeApp',
            namespaceType: 'multiple-isolated',
            hiddenType: false,
            title: 'Visualization',
          },
          relationship: 'child',
          type: 'visualization',
          managed: false,
        },
      ])
    );
  });
});
