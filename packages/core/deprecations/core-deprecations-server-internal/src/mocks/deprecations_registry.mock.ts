/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { DeprecationsRegistry } from '../deprecations_registry';

type DeprecationsRegistryContract = PublicMethodsOf<DeprecationsRegistry>;

const createDeprecationsRegistryMock = () => {
  const mocked: jest.Mocked<DeprecationsRegistryContract> = {
    registerDeprecations: jest.fn(),
    getDeprecations: jest.fn(),
  };

  return mocked as jest.Mocked<DeprecationsRegistry>;
};

const createGetDeprecationsContextMock = () => {
  const mocked: jest.Mocked<GetDeprecationsContext> = {
    esClient: elasticsearchClientMock.createScopedClusterClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
  };

  return mocked;
};

export const mockDeprecationsRegistry = {
  create: createDeprecationsRegistryMock,
  createGetDeprecationsContext: createGetDeprecationsContextMock,
};
