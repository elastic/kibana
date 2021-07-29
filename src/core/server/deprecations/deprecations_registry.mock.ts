/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeprecationsRegistry } from './deprecations_registry';
import type { GetDeprecationsContext } from './types';
import { elasticsearchClientMock } from '../elasticsearch/client/mocks';
import { savedObjectsClientMock } from '../saved_objects/service/saved_objects_client.mock';
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
