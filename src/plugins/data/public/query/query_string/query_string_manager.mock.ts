/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { QueryStringContract } from '.';

const createSetupContractMock = () => {
  const queryStringManagerMock: jest.Mocked<QueryStringContract> = {
    getQuery: jest.fn(),
    setQuery: jest.fn(),
    getUpdates$: jest.fn(),
    getDefaultQuery: jest.fn(),
    formatQuery: jest.fn(),
    clearQuery: jest.fn(),
  };
  return queryStringManagerMock;
};

export const queryStringManagerMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
