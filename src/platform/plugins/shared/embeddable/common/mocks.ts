/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExtractFunction, getInjectFunction } from './lib';
import { CommonEmbeddableStartContract, EmbeddablePersistableStateService } from './types';

export const createEmbeddablePersistableStateServiceMock =
  (): jest.Mocked<EmbeddablePersistableStateService> => {
    const commonContractMock = createCommonContractEmbeddableMock();
    return {
      inject: jest.fn().mockImplementation(getInjectFunction(commonContractMock)),
      extract: jest.fn().mockImplementation(getExtractFunction(commonContractMock)),
      getAllMigrations: jest.fn(() => ({})),
      telemetry: jest.fn((state, collector) => ({})),
    };
  };

const createCommonContractEmbeddableMock = (): jest.Mocked<CommonEmbeddableStartContract> => {
  return {
    getEnhancement: jest.fn((id: string) => ({
      id,
      telemetry: jest.fn((state, collector) => ({})),
      inject: jest.fn((state, collector) => ({})),
      extract: jest.fn((state) => ({ state, references: [] })),
      migrations: {},
    })),
    getEmbeddableFactory: jest.fn(),
  };
};
