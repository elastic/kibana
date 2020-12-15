/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
