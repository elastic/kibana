/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import { Readable } from 'node:stream';

import type { EventUploadOptions } from './upload_events';
import { uploadAllEventsFromPath, nonThrowingUploadAllEventsFromPath } from './upload_events';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ScoutReportDataStream } from '../reporting';

jest.mock('node:fs');

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

  const spies = {
    existsSync: jest.spyOn(fs, 'existsSync'),
    statSync: jest.spyOn(fs, 'statSync'),
    readdirSync: jest.spyOn(fs, 'readdirSync'),
  };

  beforeEach(() => {
    log = {
      info: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(spies).forEach((spy) => spy.mockRestore());
  });

  it('should throw an error if the provided eventLogPath does not exist', async () => {
    spies.existsSync.mockReturnValue(false);

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

  it('should throw an error if the provided eventLogPath is a file and it does not end with .ndjson', async () => {
    spies.existsSync.mockReturnValue(true);
    spies.statSync.mockReturnValue({
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

  it('should log a warning if the provided eventLogPath is a directory and it does not contain any .ndjson file', async () => {
    spies.existsSync.mockReturnValue(true);

    // Simulate directory contents: 1 .txt file
    (fs.readdirSync as jest.Mock).mockImplementation((directoryPath: string) => {
      if (directoryPath === 'mocked_directory') {
        return ['not_events.txt'];
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

    expect(log.warning).toHaveBeenCalledWith(
      `No .ndjson event log files found in directory 'mocked_directory'.`
    );
  });

  it('should upload the event log file if the provided eventLogPath if a file and ends with .ndjson', async () => {
    spies.statSync.mockReturnValue({
      isDirectory: () => true,
    } as unknown as fs.Stats);
    spies.readdirSync.mockReturnValue(['file.txt' as unknown as fs.Dirent]);

    // assume the provided event log path exists
    spies.existsSync.mockReturnValue(true);

    // the provided event log path is not a directory
    spies.statSync.mockReturnValue({
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

  it('should find event log files recursively', async () => {
    spies.existsSync.mockReturnValue(true);

    (fs.readdirSync as jest.Mock).mockImplementation((directoryPath: string) => {
      if (directoryPath === 'mocked_directory') {
        return ['sub_directory', 'no_events_here.txt'];
      }

      if (directoryPath === 'mocked_directory/sub_directory') {
        return ['events.ndjson'];
      }

      return [];
    });

    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === 'mocked_directory') {
        return { isDirectory: () => true, isFile: () => false } as fs.Stats;
      }
      if (filePath === 'mocked_directory/sub_directory') {
        return { isDirectory: () => true, isFile: () => false } as fs.Stats;
      }
      return { isDirectory: () => false, isFile: () => true } as fs.Stats;
    });

    await uploadAllEventsFromPath('mocked_directory/sub_directory', {
      esURL: 'esURL',
      esAPIKey: 'esAPIKey',
      verifyTLSCerts: true,
      log,
    });

    expect(mockAddEventsFromFile).toHaveBeenCalledWith(
      'mocked_directory/sub_directory/events.ndjson'
    );

    expect(log.info.mock.calls).toEqual([
      ['Connecting to Elasticsearch at esURL'],
      ["Recursively found 1 .ndjson event log file in directory 'mocked_directory/sub_directory'."],
    ]);
  });

  it('should upload multiple event log files if the provided eventLogPath is a directory and contains .ndjson files', async () => {
    spies.existsSync.mockReturnValue(true);

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

    // addEventsFromFile should be called once with all .ndjson files, in order
    expect(mockAddEventsFromFile).toHaveBeenCalledTimes(1);
    expect(mockAddEventsFromFile).toHaveBeenCalledWith(
      'mocked_directory/file1.ndjson',
      'mocked_directory/file2.ndjson'
    );

    expect(log.info.mock.calls).toEqual([
      ['Connecting to Elasticsearch at esURL'],
      ["Recursively found 2 .ndjson event log files in directory 'mocked_directory'."],
    ]);
  });

  it('addEventsFromFile should concatenate lines from multiple files in order and pass a single datasource to bulk helper', async () => {
    // Use the real implementation of ScoutReportDataStream for this test
    const { ScoutReportDataStream: RealScoutReportDataStream } = jest.requireActual(
      '../reporting/report/events'
    ) as { ScoutReportDataStream: typeof ScoutReportDataStream };

    // Mock file contents for two .ndjson files
    const fileContents: Record<string, string> = {
      'file1.ndjson': 'a1\na2\n',
      'file2.ndjson': 'b1\n',
    };

    const createReadStreamMock = jest
      .spyOn(fs, 'createReadStream')
      .mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        const key = filePathStr.endsWith('file1.ndjson')
          ? 'file1.ndjson'
          : filePathStr.endsWith('file2.ndjson')
          ? 'file2.ndjson'
          : '';
        const content = fileContents[key] ?? '';
        return Readable.from([content]) as fs.ReadStream;
      });

    // Mock ES client bulk helper and assert datasource yields concatenated lines in order
    const bulkMock = jest.fn(async (opts: any) => {
      const lines: string[] = [];
      for await (const line of opts.datasource as AsyncIterable<string>) {
        lines.push(line);
      }

      expect(lines).toEqual(['a1', 'a2', 'b1']);
      // Return minimal stats object expected by the implementation
      return { total: lines.length, time: 1000, failed: 0 };
    });

    const es: any = { helpers: { bulk: bulkMock } };
    const localLog = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as Partial<jest.Mock<ToolingLog>> as ToolingLog;

    const dataStream = new RealScoutReportDataStream(es, localLog);

    await dataStream.addEventsFromFile('file1.ndjson', 'file2.ndjson');

    expect(bulkMock).toHaveBeenCalledTimes(1);

    expect(bulkMock.mock.results[0].value).resolves.toEqual({
      total: 3,
      time: 1000,
      failed: 0,
    });

    createReadStreamMock.mockRestore();
  });
});

describe('nonThrowingUploadAllEventsFromPath', () => {
  it('should not throw and only log a warning', async () => {
    const log: jest.Mocked<ToolingLog> = {
      info: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    } as any;

    const eventLogPath = '/some/path/that/does/not/exist';
    const eventUploadOptions: EventUploadOptions = {
      esURL: 'esURL',
      esAPIKey: 'esAPIKey',
      verifyTLSCerts: true,
      log,
    };

    await expect(
      nonThrowingUploadAllEventsFromPath(eventLogPath, eventUploadOptions)
    ).resolves.toBeUndefined();

    expect(log.warning.mock.calls).toEqual([
      [`An error was suppressed: The provided event log path '${eventLogPath}' does not exist.`],
    ]);
  });
});
