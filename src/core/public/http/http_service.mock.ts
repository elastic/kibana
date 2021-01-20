/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { HttpService } from './http_service';
import { HttpSetup } from './types';
import { BehaviorSubject } from 'rxjs';
import { BasePath } from './base_path';

export type HttpSetupMock = jest.Mocked<HttpSetup> & {
  basePath: BasePath;
  anonymousPaths: jest.Mocked<HttpSetup['anonymousPaths']>;
};

const createServiceMock = ({ basePath = '' } = {}): HttpSetupMock => ({
  fetch: jest.fn(),
  get: jest.fn(),
  head: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  options: jest.fn(),
  basePath: new BasePath(basePath),
  anonymousPaths: {
    register: jest.fn(),
    isAnonymous: jest.fn(),
  },
  externalUrl: {
    validateUrl: jest.fn(),
  },
  addLoadingCountSource: jest.fn(),
  getLoadingCount$: jest.fn().mockReturnValue(new BehaviorSubject(0)),
  intercept: jest.fn(),
});

const createMock = ({ basePath = '' } = {}) => {
  const mocked: jest.Mocked<PublicMethodsOf<HttpService>> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockReturnValue(createServiceMock({ basePath }));
  mocked.start.mockReturnValue(createServiceMock({ basePath }));
  return mocked;
};

export const httpServiceMock = {
  create: createMock,
  createSetupContract: createServiceMock,
  createStartContract: createServiceMock,
};
