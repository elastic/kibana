/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { listFilesOlderThan, listFilesExceedingSize } from './utils';
import type { deleteFiles } from './fs';

export const listFilesExceedingSizeMock: MockedFunction<typeof listFilesExceedingSize> = vi.fn();
export const listFilesOlderThanMock: MockedFunction<typeof listFilesOlderThan> = vi.fn();

vi.doMock('./utils', async () => {
  const actual = (await vi.importActual('./utils'));
  return {
    ...actual,
    listFilesExceedingSize: listFilesExceedingSizeMock,
    listFilesOlderThan: listFilesOlderThanMock,
  };
});

export const deleteFilesMock: MockedFunction<typeof deleteFiles> = vi.fn();

vi.doMock('./fs', async () => {
  const actual = (await vi.importActual('./fs'));
  return {
    ...actual,
    deleteFiles: deleteFilesMock,
  };
});
