/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ElasticsearchClientMock,
  elasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import type { MigratorContext } from '../context';

export type MockedMigratorContext = Omit<MigratorContext, 'elasticsearchClient'> & {
  elasticsearchClient: ElasticsearchClientMock;
};

export const createContextMock = (
  parts: Partial<MockedMigratorContext> = {}
): MockedMigratorContext => {
  const typeRegistry = new SavedObjectTypeRegistry();

  return {
    indexPrefix: '.kibana',
    types: ['foo', 'bar'],
    elasticsearchClient: elasticsearchClientMock.createElasticsearchClient(),
    maxRetryAttempts: 15,
    migrationDocLinks: docLinksServiceMock.createSetupContract().links.kibanaUpgradeSavedObjects,
    typeRegistry,
    serializer: serializerMock.create(),
    ...parts,
  };
};
