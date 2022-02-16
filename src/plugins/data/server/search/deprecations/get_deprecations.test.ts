/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GetDeprecationsContext, SavedObjectsClientContract } from 'kibana/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { getDeprecations } from './get_deprecations';

function getMockConfigObj(batchSearches?: boolean) {
  const attributes = {
    buildNum: 9007199254740991,
    ...(batchSearches !== undefined && { 'courier:batchSearches': batchSearches }),
  };
  return {
    type: 'config',
    id: '7.17.0',
    attributes,
    references: [],
    migrationVersion: { config: '7.13.0' },
    coreMigrationVersion: '7.17.0',
    updated_at: '2022-01-12T19:14:27.230Z',
    version: 'WzQ3LDFd',
    namespaces: ['default'],
    score: 0,
  };
}

describe('data plugin search service deprecations', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let context: GetDeprecationsContext;

  beforeEach(async () => {
    savedObjectsClient = savedObjectsClientMock.create();
    context = { savedObjectsClient } as unknown as GetDeprecationsContext;
  });

  test('returns empty array if courier:batchSearches is not explicitly set', async () => {
    savedObjectsClient.find.mockResolvedValue({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [getMockConfigObj(undefined)],
    });

    const deprecations = await getDeprecations(context);
    expect(deprecations).toHaveLength(0);
  });

  test('returns empty array if courier:batchSearches is set to false', async () => {
    savedObjectsClient.find.mockResolvedValue({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [getMockConfigObj(false)],
    });

    const deprecations = await getDeprecations(context);
    expect(deprecations).toHaveLength(0);
  });

  test('returns a deprecation if courier:batchSearches is set to true', async () => {
    savedObjectsClient.find.mockResolvedValue({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [getMockConfigObj(true)],
    });

    const deprecations = await getDeprecations(context);
    expect(deprecations).toHaveLength(1);
  });
});
