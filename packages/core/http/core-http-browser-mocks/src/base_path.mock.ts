/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBasePath } from '@kbn/core-http-browser';

const createBasePathMock = ({
  publicBaseUrl = '/',
  serverBasePath = '/',
  assetsHrefBase = '/',
}: { publicBaseUrl?: string; serverBasePath?: string; assetsHrefBase?: string } = {}) => {
  const mock: jest.Mocked<IBasePath> = {
    prepend: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
    publicBaseUrl,
    serverBasePath,
    assetsHrefBase,
  };

  return mock;
};

export const basePathMock = {
  create: createBasePathMock,
};
