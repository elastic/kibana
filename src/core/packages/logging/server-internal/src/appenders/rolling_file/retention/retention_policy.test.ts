/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  listFilesExceedingSizeMock,
  listFilesOlderThanMock,
  deleteFilesMock,
} from './retention_policy.test.mocks';
import type { RetentionPolicyConfig } from '@kbn/core-logging-server';
import { rollingFileAppenderMocks } from '../mocks';
import { GenericRetentionPolicy, retentionPolicyConfigSchema } from './retention_policy';

describe('GenericRetentionPolicy', () => {
  let context: ReturnType<typeof rollingFileAppenderMocks.createContext>;
  let config: RetentionPolicyConfig;

  beforeEach(() => {
    deleteFilesMock.mockReset();
    listFilesExceedingSizeMock.mockReset();
    listFilesOlderThanMock.mockReset();

    context = rollingFileAppenderMocks.createContext();
  });

  it('supports the maxFile directive', async () => {
    config = retentionPolicyConfigSchema.validate({
      maxFiles: 2,
    });
    context.getOrderedRolledFiles.mockResolvedValue(['file-1', 'file-2', 'file-3', 'file-4']);

    const policy = new GenericRetentionPolicy(config, context);

    await policy.apply();

    expect(deleteFilesMock).toHaveBeenCalledTimes(1);
    expect(deleteFilesMock).toHaveBeenCalledWith({
      filesToDelete: ['file-3', 'file-4'],
    });
  });

  it('supports the maxAccumulatedFileSize directive', async () => {
    config = retentionPolicyConfigSchema.validate({
      maxAccumulatedFileSize: '50b',
    });
    context.getOrderedRolledFiles.mockResolvedValue(['file-1', 'file-2', 'file-3', 'file-4']);

    listFilesExceedingSizeMock.mockResolvedValue(['file-4']);

    const policy = new GenericRetentionPolicy(config, context);

    await policy.apply();

    expect(listFilesOlderThanMock).not.toHaveBeenCalled();
    expect(listFilesExceedingSizeMock).toHaveBeenCalledTimes(1);
    expect(listFilesExceedingSizeMock).toHaveBeenCalledWith({
      orderedFiles: ['file-1', 'file-2', 'file-3', 'file-4'],
      maxSizeInBytes: config.maxAccumulatedFileSize!.getValueInBytes(),
    });

    expect(deleteFilesMock).toHaveBeenCalledTimes(1);
    expect(deleteFilesMock).toHaveBeenCalledWith({
      filesToDelete: ['file-4'],
    });
  });

  it('supports the removeOlderThan directive', async () => {
    config = retentionPolicyConfigSchema.validate({
      removeOlderThan: '30d',
    });
    context.getOrderedRolledFiles.mockResolvedValue(['file-1', 'file-2', 'file-3', 'file-4']);

    listFilesOlderThanMock.mockResolvedValue(['file-2', 'file-3', 'file-4']);

    const policy = new GenericRetentionPolicy(config, context);

    await policy.apply();

    expect(listFilesExceedingSizeMock).not.toHaveBeenCalled();
    expect(listFilesOlderThanMock).toHaveBeenCalledTimes(1);
    expect(listFilesOlderThanMock).toHaveBeenCalledWith({
      orderedFiles: ['file-1', 'file-2', 'file-3', 'file-4'],
      duration: config.removeOlderThan!,
    });

    expect(deleteFilesMock).toHaveBeenCalledTimes(1);
    expect(deleteFilesMock).toHaveBeenCalledWith({
      filesToDelete: ['file-2', 'file-3', 'file-4'],
    });
  });

  it('supports all directives at the same time', async () => {
    config = retentionPolicyConfigSchema.validate({
      maxFiles: 3,
      removeOlderThan: '30d',
      maxAccumulatedFileSize: '50b',
    });
    context.getOrderedRolledFiles.mockResolvedValue(['file-1', 'file-2', 'file-3', 'file-4']);

    listFilesOlderThanMock.mockResolvedValue(['file-2']);
    listFilesExceedingSizeMock.mockResolvedValue(['file-3']);

    const policy = new GenericRetentionPolicy(config, context);

    await policy.apply();

    expect(listFilesExceedingSizeMock).toHaveBeenCalledTimes(1);
    expect(listFilesExceedingSizeMock).toHaveBeenCalledWith({
      orderedFiles: ['file-1', 'file-2', 'file-3', 'file-4'],
      maxSizeInBytes: config.maxAccumulatedFileSize!.getValueInBytes(),
    });

    expect(listFilesOlderThanMock).toHaveBeenCalledTimes(1);
    expect(listFilesOlderThanMock).toHaveBeenCalledWith({
      orderedFiles: ['file-1', 'file-2', 'file-3', 'file-4'],
      duration: config.removeOlderThan!,
    });

    expect(deleteFilesMock).toHaveBeenCalledTimes(1);
    expect(deleteFilesMock).toHaveBeenCalledWith({
      filesToDelete: ['file-4', 'file-3', 'file-2'],
    });
  });

  it('do not call deleteFiles if no file should be deleted', async () => {
    config = retentionPolicyConfigSchema.validate({
      maxFiles: 5,
    });
    context.getOrderedRolledFiles.mockResolvedValue(['file-1', 'file-2', 'file-3', 'file-4']);

    const policy = new GenericRetentionPolicy(config, context);

    await policy.apply();

    expect(deleteFilesMock).not.toHaveBeenCalled();
  });
});
