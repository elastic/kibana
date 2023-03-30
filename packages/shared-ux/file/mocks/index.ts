/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { BaseFilesClient } from '@kbn/shared-ux-file-types';

export const createMockFilesClient = (): DeeplyMockedKeys<BaseFilesClient> => ({
  create: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  upload: jest.fn(),
  getFileKind: jest.fn(),
  getDownloadHref: jest.fn(),
  bulkDelete: jest.fn(),
  download: jest.fn(),
  find: jest.fn(),
  getById: jest.fn(),
  getShare: jest.fn(),
  listShares: jest.fn(),
  share: jest.fn(),
  unshare: jest.fn(),
  update: jest.fn(),
});
