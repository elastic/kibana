/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import {
  accessMock,
  readdirMock,
  renameMock,
  unlinkMock,
  clearAllMocks,
} from './rolling_tasks.test.mocks';
import {
  shouldSkipRollout,
  rollCurrentFile,
  rollPreviousFilesInOrder,
  deleteFiles,
  getOrderedRolledFiles,
} from './rolling_tasks';

describe('NumericRollingStrategy tasks', () => {
  afterEach(() => {
    clearAllMocks();
  });

  describe('shouldSkipRollout', () => {
    it('calls `exists` with the correct parameters', async () => {
      await shouldSkipRollout({ logFilePath: 'some-file' });

      expect(accessMock).toHaveBeenCalledTimes(1);
      expect(accessMock).toHaveBeenCalledWith('some-file');
    });
    it('returns `true` if the file is current log file does not exist', async () => {
      accessMock.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(await shouldSkipRollout({ logFilePath: 'some-file' })).toEqual(true);
    });
    it('returns `false` if the file is current log file exists', async () => {
      accessMock.mockResolvedValue(undefined);

      expect(await shouldSkipRollout({ logFilePath: 'some-file' })).toEqual(false);
    });
  });

  describe('rollCurrentFile', () => {
    it('calls `rename` with the correct parameters', async () => {
      await rollCurrentFile({
        logFileFolder: 'log-folder',
        logFileBaseName: 'kibana.log',
        pattern: '.%i',
      });

      expect(renameMock).toHaveBeenCalledTimes(1);
      expect(renameMock).toHaveBeenCalledWith(
        join('log-folder', 'kibana.log'),
        join('log-folder', 'kibana.1.log')
      );
    });
  });

  describe('rollPreviousFilesInOrder', () => {
    it('calls `rename` once for each file', async () => {
      await rollPreviousFilesInOrder({
        filesToRoll: ['file-1', 'file-2', 'file-3'],
        logFileFolder: 'log-folder',
        logFileBaseName: 'file',
        pattern: '-%i',
      });

      expect(renameMock).toHaveBeenCalledTimes(3);
    });

    it('calls `rename` with the correct parameters', async () => {
      await rollPreviousFilesInOrder({
        filesToRoll: ['file-1', 'file-2'],
        logFileFolder: 'log-folder',
        logFileBaseName: 'file',
        pattern: '-%i',
      });

      expect(renameMock).toHaveBeenNthCalledWith(
        1,
        join('log-folder', 'file-2'),
        join('log-folder', 'file-3')
      );
      expect(renameMock).toHaveBeenNthCalledWith(
        2,
        join('log-folder', 'file-1'),
        join('log-folder', 'file-2')
      );
    });
  });

  describe('deleteFiles', () => {
    it('calls `unlink` once for each file', async () => {
      await deleteFiles({
        logFileFolder: 'log-folder',
        filesToDelete: ['file-a', 'file-b', 'file-c'],
      });

      expect(unlinkMock).toHaveBeenCalledTimes(3);
    });
    it('calls `unlink` with the correct parameters', async () => {
      await deleteFiles({
        logFileFolder: 'log-folder',
        filesToDelete: ['file-a', 'file-b'],
      });

      expect(unlinkMock).toHaveBeenNthCalledWith(1, join('log-folder', 'file-a'));
      expect(unlinkMock).toHaveBeenNthCalledWith(2, join('log-folder', 'file-b'));
    });
  });

  describe('getOrderedRolledFiles', () => {
    it('returns the rolled files matching the pattern in order', async () => {
      readdirMock.mockResolvedValue([
        'kibana-10.log',
        'kibana-1.log',
        'kibana-12.log',
        'kibana-2.log',
      ]);

      const files = await getOrderedRolledFiles({
        logFileFolder: 'log-folder',
        logFileBaseName: 'kibana.log',
        pattern: '-%i',
      });

      expect(files).toEqual(['kibana-1.log', 'kibana-2.log', 'kibana-10.log', 'kibana-12.log']);
    });

    it('ignores files that do no match the pattern', async () => {
      readdirMock.mockResolvedValue(['kibana.2.log', 'kibana.1.log', 'kibana-3.log', 'foo.log']);

      const files = await getOrderedRolledFiles({
        logFileFolder: 'log-folder',
        logFileBaseName: 'kibana.log',
        pattern: '.%i',
      });

      expect(files).toEqual(['kibana.1.log', 'kibana.2.log']);
    });

    it('does not return the base log file', async () => {
      readdirMock.mockResolvedValue(['kibana.log', 'kibana-1.log', 'kibana-2.log']);

      const files = await getOrderedRolledFiles({
        logFileFolder: 'log-folder',
        logFileBaseName: 'kibana.log',
        pattern: '-%i',
      });

      expect(files).toEqual(['kibana-1.log', 'kibana-2.log']);
    });
  });
});
