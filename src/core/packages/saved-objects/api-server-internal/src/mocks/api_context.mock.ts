/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import {
  elasticsearchClientMock,
  ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import type { ApiExecutionContext } from '../lib/apis/types';
import { apiHelperMocks, RepositoryHelpersMock } from './api_helpers.mocks';
import { savedObjectsExtensionsMock } from './saved_objects_extensions.mock';
import { createMigratorMock, KibanaMigratorMock } from './migrator.mock';

export type ApiExecutionContextMock = Pick<ApiExecutionContext, 'allowedTypes' | 'mappings'> & {
  registry: SavedObjectTypeRegistry;
  helpers: RepositoryHelpersMock;
  extensions: ReturnType<typeof savedObjectsExtensionsMock.create>;
  client: ElasticsearchClientMock;
  serializer: ReturnType<typeof serializerMock.create>;
  migrator: KibanaMigratorMock;
  logger: MockedLogger;
};

const createApiExecutionContextMock = ({
  allowedTypes = ['foo', 'bar'],
}: {
  allowedTypes?: string[];
} = {}): ApiExecutionContextMock => {
  return {
    registry: new SavedObjectTypeRegistry(),
    helpers: apiHelperMocks.create(),
    extensions: savedObjectsExtensionsMock.create(),
    client: elasticsearchClientMock.createElasticsearchClient(),
    serializer: serializerMock.create(),
    migrator: createMigratorMock(),
    logger: loggerMock.create(),
    allowedTypes,
    mappings: { properties: { mockMappings: { type: 'text' } } },
  };
};

export const apiContextMock = {
  create: createApiExecutionContextMock,
};
