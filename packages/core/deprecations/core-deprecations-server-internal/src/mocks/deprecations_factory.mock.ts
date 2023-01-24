/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeprecationsFactory } from '../deprecations_factory';

type DeprecationsFactoryContract = PublicMethodsOf<DeprecationsFactory>;

const createDeprecationsFactoryMock = () => {
  const mocked: jest.Mocked<DeprecationsFactoryContract> = {
    getRegistry: jest.fn(),
    getDeprecations: jest.fn(),
    getAllDeprecations: jest.fn(),
  };

  mocked.getDeprecations.mockResolvedValue([]);
  mocked.getAllDeprecations.mockResolvedValue([]);
  return mocked as jest.Mocked<DeprecationsFactory>;
};

export const mockDeprecationsFactory = {
  create: createDeprecationsFactoryMock,
};
