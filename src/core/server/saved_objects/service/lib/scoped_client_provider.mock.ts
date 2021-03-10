/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsClientProvider } from './scoped_client_provider';

const create = (): jest.Mocked<ISavedObjectsClientProvider> => ({
  addClientWrapperFactory: jest.fn(),
  getClient: jest.fn(),
  setClientFactory: jest.fn(),
});

export const savedObjectsClientProviderMock = {
  create,
};
