/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import {
  resetAllMock,
  shouldSkipRolloutMock,
  deleteFilesMock,
  getOrderedRolledFilesMock,
  rollCurrentFileMock,
  rollPreviousFilesInOrderMock,
} from './numeric_strategy.test.mocks';
import { rollingFileAppenderMocks } from '../../mocks';
import { NumericRollingStrategy, NumericRollingStrategyConfig } from './numeric_strategy';

const logFileFolder = 'log-file-folder';
const logFileBaseName = 'kibana.log';
const pattern = '.%i';
const logFilePath = join(logFileFolder, logFileBaseName);

describe('NumericRollingStrategy', () => {
  let context: ReturnType<typeof rollingFileAppenderMocks.createContext>;
  let strategy: NumericRollingStrategy;

  const createStrategy = (config: Omit<NumericRollingStrategyConfig, 'type'>) =>
    new NumericRollingStrategy({ ...config, type: 'numeric' }, context);

  beforeEach(() => {
    context = rollingFileAppenderMocks.createContext(logFilePath);
    strategy = createStrategy({ pattern, max: 3 });
    shouldSkipRolloutMock.mockResolvedValue(false);
    getOrderedRolledFilesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    resetAllMock();
  });

  it('calls `getOrderedRolledFiles` with the correct parameters', async () => {
    await strategy.rollout();

    expect(getOrderedRolledFilesMock).toHaveBeenCalledTimes(1);
    expect(getOrderedRolledFilesMock).toHaveBeenCalledWith({
      logFileFolder,
      logFileBaseName,
      pattern,
    });
  });

  it('calls `deleteFiles` with the correct files', async () => {
    getOrderedRolledFilesMock.mockResolvedValue([
      'kibana.1.log',
      'kibana.2.log',
      'kibana.3.log',
      'kibana.4.log',
    ]);

    await strategy.rollout();

    expect(deleteFilesMock).toHaveBeenCalledTimes(1);
    expect(deleteFilesMock).toHaveBeenCalledWith({
      filesToDelete: ['kibana.3.log', 'kibana.4.log'],
      logFileFolder,
    });
  });

  it('calls `rollPreviousFilesInOrder` with the correct files', async () => {
    getOrderedRolledFilesMock.mockResolvedValue([
      'kibana.1.log',
      'kibana.2.log',
      'kibana.3.log',
      'kibana.4.log',
    ]);

    await strategy.rollout();

    expect(rollPreviousFilesInOrderMock).toHaveBeenCalledTimes(1);
    expect(rollPreviousFilesInOrderMock).toHaveBeenCalledWith({
      filesToRoll: ['kibana.1.log', 'kibana.2.log'],
      logFileFolder,
      logFileBaseName,
      pattern,
    });
  });

  it('calls `rollCurrentFile` with the correct parameters', async () => {
    await strategy.rollout();

    expect(rollCurrentFileMock).toHaveBeenCalledTimes(1);
    expect(rollCurrentFileMock).toHaveBeenCalledWith({
      pattern,
      logFileBaseName,
      logFileFolder,
    });
  });

  it('calls `context.refreshFileInfo` with the correct parameters', async () => {
    await strategy.rollout();

    expect(context.refreshFileInfo).toHaveBeenCalledTimes(1);
  });

  it('calls the tasks in the correct order', async () => {
    getOrderedRolledFilesMock.mockResolvedValue([
      'kibana.1.log',
      'kibana.2.log',
      'kibana.3.log',
      'kibana.4.log',
    ]);

    await strategy.rollout();

    const deleteFilesCall = deleteFilesMock.mock.invocationCallOrder[0];
    const rollPreviousFilesInOrderCall = rollPreviousFilesInOrderMock.mock.invocationCallOrder[0];
    const rollCurrentFileCall = rollCurrentFileMock.mock.invocationCallOrder[0];
    const refreshFileInfoCall = context.refreshFileInfo.mock.invocationCallOrder[0];

    expect(deleteFilesCall).toBeLessThan(rollPreviousFilesInOrderCall);
    expect(rollPreviousFilesInOrderCall).toBeLessThan(rollCurrentFileCall);
    expect(rollCurrentFileCall).toBeLessThan(refreshFileInfoCall);
  });

  it('do not calls `deleteFiles` if no file should be deleted', async () => {
    getOrderedRolledFilesMock.mockResolvedValue(['kibana.1.log', 'kibana.2.log']);

    await strategy.rollout();

    expect(deleteFilesMock).not.toHaveBeenCalled();
  });

  it('do not calls `rollPreviousFilesInOrder` if no file should be rolled', async () => {
    getOrderedRolledFilesMock.mockResolvedValue([]);

    await strategy.rollout();

    expect(rollPreviousFilesInOrderMock).not.toHaveBeenCalled();
  });

  it('skips the rollout if `shouldSkipRollout` returns true', async () => {
    shouldSkipRolloutMock.mockResolvedValue(true);
    getOrderedRolledFilesMock.mockResolvedValue([
      'kibana.1.log',
      'kibana.2.log',
      'kibana.3.log',
      'kibana.4.log',
    ]);

    await strategy.rollout();

    expect(getOrderedRolledFilesMock).not.toHaveBeenCalled();
    expect(deleteFilesMock).not.toHaveBeenCalled();
    expect(rollPreviousFilesInOrderMock).not.toHaveBeenCalled();
    expect(rollCurrentFileMock).not.toHaveBeenCalled();
    expect(context.refreshFileInfo).not.toHaveBeenCalled();
  });
});
