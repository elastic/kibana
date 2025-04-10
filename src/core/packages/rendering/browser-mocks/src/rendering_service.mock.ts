/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RenderingService as RenderingServiceInternal } from '@kbn/core-rendering-browser-internal';
import type { RenderingService } from '@kbn/core-rendering-browser';

type RenderingServiceContractInternal = PublicMethodsOf<RenderingServiceInternal>;
type RenderingServiceContract = PublicMethodsOf<RenderingService>;

const createMockInternal = () => {
  const mocked: jest.Mocked<RenderingServiceContractInternal> = {
    start: jest.fn(),
    renderCore: jest.fn(),
    addContext: jest.fn(),
  };
  return mocked;
};

const createMock = () => {
  const mocked: jest.Mocked<RenderingServiceContract> = {
    addContext: jest.fn().mockImplementation((element) => element),
  };
  return mocked;
};

export const renderingServiceMock = {
  createInternal: createMockInternal,
  create: createMock,
};
