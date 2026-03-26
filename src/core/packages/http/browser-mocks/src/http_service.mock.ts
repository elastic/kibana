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
import { lazyObject } from '@kbn/lazy-object';

export type HttpSetupMock = jest.Mocked<HttpSetup> & {
  basePath: BasePath;
  anonymousPaths: jest.Mocked<HttpSetup['anonymousPaths']>;
};

const createServiceMock = ({
  basePath = '',
  publicBaseUrl,
}: { basePath?: string; publicBaseUrl?: string } = {}): HttpSetupMock =>
  lazyObject({
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
    anonymousPaths: lazyObject({
      register: jest.fn(),
      isAnonymous: jest.fn(),
    }),
    externalUrl: lazyObject({
      isInternalUrl: jest.fn(),
      validateUrl: jest.fn(),
    }),
    staticAssets: lazyObject({
      getPluginAssetHref: jest.fn(),
    }),
    addLoadingCountSource: jest.fn(),
    getLoadingCount$: jest.fn().mockReturnValue(new BehaviorSubject(0)),
    intercept: jest.fn(),
  });

const createMock = ({ basePath = '' } = {}) => {
  const mocked: jest.Mocked<PublicMethodsOf<HttpService>> = lazyObject({
    setup: jest.fn().mockReturnValue(createServiceMock({ basePath })),
    start: jest.fn().mockReturnValue(createServiceMock({ basePath })),
    stop: jest.fn(),
  });
  return mocked;
};

export const httpServiceMock = {
  create: createMock,
  createSetupContract: createServiceMock,
  createStartContract: createServiceMock,
  createBasePath: basePathMock.create,
};
