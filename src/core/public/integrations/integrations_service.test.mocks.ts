/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreService } from '../../types';

const createCoreServiceMock = (): jest.Mocked<CoreService> => {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
};

export const styleServiceMock = createCoreServiceMock();
jest.doMock('./styles', () => ({
  StylesService: jest.fn(() => styleServiceMock),
}));

export const momentServiceMock = createCoreServiceMock();
jest.doMock('./moment', () => ({
  MomentService: jest.fn(() => momentServiceMock),
}));
