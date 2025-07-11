/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';

import { uploadAllEventsFromPath } from './upload_events';
import { ToolingLog } from '@kbn/tooling-log';

jest.mock('fs');

jest.mock('@kbn/scout-info', () => ({
  SCOUT_REPORT_OUTPUT_ROOT: 'scout/reports/directory',
}));

jest.mock('../helpers/elasticsearch', () => ({
  getValidatedESClient: jest.fn(),
}));

const mockAddEventsFromFile = jest.fn();

jest.mock('../reporting/report/events', () => ({
  ScoutReportDataStream: jest.fn().mockImplementation(() => {
    return {
      addEventsFromFile: mockAddEventsFromFile,
    };
  }),
}));

describe('uploadAllEventsFromPath', () => {
  let log: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    log = {
      info: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if the provided eventLogPath does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    await expect(
      uploadAllEventsFromPath('non_existent_path', {
        esURL: 'esURL',
        esAPIKey: 'esAPIKey',
        verifyTLSCerts: true,
        log,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The provided event log path 'non_existent_path' does not exist."`
    );
  });

  it('should throw an error if the provided eventLogPath does not end with .ndjson', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false,
    } as unknown as fs.Stats);

    await expect(
      uploadAllEventsFromPath('invalid_event_log.txt', {
        esURL: 'esURL',
        esAPIKey: 'esAPIKey',
        verifyTLSCerts: true,
        log,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The provided event log file 'invalid_event_log.txt' must end with .ndjson."`
    );
  });

  it('should log a warning if the provided folder does not contain any .ndjson file', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => true,
    } as unknown as fs.Stats);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['file.txt' as unknown as fs.Dirent]);

    await expect(
      uploadAllEventsFromPath('invalid_event_log_directory', {
        esURL: 'esURL',
        esAPIKey: 'esAPIKey',
        verifyTLSCerts: true,
        log,
      })
    );
    expect(log.warning).toHaveBeenCalledWith(
      `The provided event log directory 'invalid_event_log_directory' does not contain any .ndjson files.`
    );
  });

  it('should upload the event log file', async () => {
    // assume the provided event log path exists
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // the provided event log path is not a directory
    jest.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false,
    } as unknown as fs.Stats);

    await uploadAllEventsFromPath('existing_event_log.ndjson', {
      esURL: 'esURL',
      esAPIKey: 'esAPIKey',
      verifyTLSCerts: true,
      log,
    });

    expect(mockAddEventsFromFile).toHaveBeenCalledWith('existing_event_log.ndjson');
  });

  it('should upload multiple event log files', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Simulate directory contents: 2 .ndjson files, 1 .txt file
    (fs.readdirSync as jest.Mock).mockImplementation((directoryPath: string) => {
      if (directoryPath === 'mocked_directory') {
        return ['file1.ndjson', 'file2.ndjson', 'not_events.txt'];
      }
      return [];
    });

    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === 'mocked_directory') {
        return { isDirectory: () => true, isFile: () => false };
      }
      return { isDirectory: () => false, isFile: () => true };
    });

    await uploadAllEventsFromPath('mocked_directory', {
      esURL: 'esURL',
      esAPIKey: 'esAPIKey',
      verifyTLSCerts: true,
      log,
    });

    expect(mockAddEventsFromFile).toHaveBeenCalledWith('mocked_directory/file1.ndjson');
    expect(mockAddEventsFromFile).toHaveBeenCalledWith('mocked_directory/file2.ndjson');
    expect(mockAddEventsFromFile).not.toHaveBeenCalledWith('mocked_directory/not_events.txt');
  });
});
