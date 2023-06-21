/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMockFilesClient as createBaseMocksFilesClient } from '@kbn/shared-ux-file-mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { FilesSetup } from '.';
import type { FilesClient, FilesClientFactory } from './types';

export const createMockFilesClient = (): DeeplyMockedKeys<FilesClient> => ({
  ...createBaseMocksFilesClient(),
  getMetrics: jest.fn(),
  publicDownload: jest.fn(),
});

export const createMockFilesSetup = (): DeeplyMockedKeys<FilesSetup> => {
  return {
    filesClientFactory: createMockFilesClientFactory(),
    registerFileKind: jest.fn(),
  };
};

export const createMockFilesClientFactory = (): DeeplyMockedKeys<FilesClientFactory> => {
  return {
    asScoped: jest.fn(),
    asUnscoped: jest.fn(),
  };
};
