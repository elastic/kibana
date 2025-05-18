/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { listFilesOlderThan, listFilesExceedingSize } from './utils';
import type { deleteFiles } from './fs';

export const listFilesExceedingSizeMock: jest.MockedFn<typeof listFilesExceedingSize> = jest.fn();
export const listFilesOlderThanMock: jest.MockedFn<typeof listFilesOlderThan> = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    listFilesExceedingSize: listFilesExceedingSizeMock,
    listFilesOlderThan: listFilesOlderThanMock,
  };
});

export const deleteFilesMock: jest.MockedFn<typeof deleteFiles> = jest.fn();

jest.doMock('./fs', () => {
  const actual = jest.requireActual('./fs');
  return {
    ...actual,
    deleteFiles: deleteFilesMock,
  };
});
