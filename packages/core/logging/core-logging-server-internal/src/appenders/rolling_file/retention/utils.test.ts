/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { getFileInfoMock } from './utils.test.mocks';
import { listFilesOlderThan, listFilesExceedingSize } from './utils';

describe('listFilesExceedingSize', () => {
  beforeEach(() => {
    getFileInfoMock.mockReset();
  });

  const mockWithSizeMap = (fileSizeMap: Record<string, number | undefined>) => {
    getFileInfoMock.mockImplementation(async (fileName) => {
      const fileSize = fileSizeMap[fileName];
      if (fileSize !== undefined) {
        return { exist: true, size: fileSize, mtime: new Date() };
      }
      return { exist: false };
    });
  };

  it('returns an empty list if total accumulated size is lower than the limit', async () => {
    mockWithSizeMap({
      'file-1': 50,
      'file-2': 50,
      'file-3': 50,
    });

    const result = await listFilesExceedingSize({
      orderedFiles: ['file-1', 'file-2', 'file-3'],
      maxSizeInBytes: 200,
    });

    expect(result).toEqual([]);
  });

  it('returns the list of files over the limit, including the one that breached the limit', async () => {
    mockWithSizeMap({
      'file-1': 100,
      'file-2': 100,
      'file-3': 100,
      'file-4': 100,
    });

    const result = await listFilesExceedingSize({
      orderedFiles: ['file-1', 'file-2', 'file-3', 'file-4'],
      maxSizeInBytes: 250,
    });

    expect(result).toEqual(['file-3', 'file-4']);
  });
});

describe('listFilesOlderThan', () => {
  beforeEach(() => {
    getFileInfoMock.mockReset();
  });

  const mockWithMtime = (fileMtimeMap: Record<string, Date | undefined>) => {
    getFileInfoMock.mockImplementation(async (fileName) => {
      const fileDate = fileMtimeMap[fileName];
      if (fileDate !== undefined) {
        return { exist: true, size: 0, mtime: fileDate };
      }
      return { exist: false };
    });
  };

  it('returns an empty list if total accumulated size is lower than the limit', async () => {
    mockWithMtime({
      'file-1': moment().add(-1, 'day').toDate(),
      'file-2': moment().add(-10, 'day').toDate(),
      'file-3': moment().add(-20, 'day').toDate(),
    });

    const result = await listFilesOlderThan({
      orderedFiles: ['file-1', 'file-2', 'file-3'],
      duration: moment.duration(15, 'day'),
    });

    expect(result).toEqual(['file-3']);
  });

  it('ignores files that were not found', async () => {
    mockWithMtime({
      'file-1': moment().add(-1, 'day').toDate(),
      'file-2': moment().add(-20, 'day').toDate(),
      'file-3': undefined,
    });

    const result = await listFilesOlderThan({
      orderedFiles: ['file-1', 'file-2', 'file-3'],
      duration: moment.duration(15, 'day'),
    });

    expect(result).toEqual(['file-2']);
  });
});
