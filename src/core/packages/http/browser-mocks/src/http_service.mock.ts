/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { type HttpService, BasePath } from '@kbn/core-http-browser-internal';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { basePathMock } from './base_path.mock';

export type HttpSetupMock = jest.Mocked<HttpSetup> & {
  basePath: BasePath;
  anonymousPaths: jest.Mocked<HttpSetup['anonymousPaths']>;
};

const createServiceMock = ({
  basePath = '',
  publicBaseUrl,
}: { basePath?: string; publicBaseUrl?: string } = {}): HttpSetupMock => ({
  fetch: jest.fn(),
  get: jest.fn(),
  head: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  options: jest.fn(),
  basePath: new BasePath({
    basePath,
    publicBaseUrl,
  }),
  anonymousPaths: {
    register: jest.fn(),
    isAnonymous: jest.fn(),
  },
  externalUrl: {
    isInternalUrl: jest.fn(),
    validateUrl: jest.fn(),
  },
  staticAssets: {
    getPluginAssetHref: jest.fn(),
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
  createBasePath: basePathMock.create,
};
