/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';

import { runUploadEvents } from './upload_events';
import { FlagsReader } from '@kbn/dev-cli-runner';
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

describe('runUploadEvents', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    flagsReader = {
      string: jest.fn(),
      requiredString: jest.fn(),
      boolean: jest.fn(),
    } as any;

    log = {
      info: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if eventLogPath is provided and does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    flagsReader.string.mockImplementation((flag) => {
      if (flag === 'eventLogPath') {
        return 'non_existent_path';
      }
    });

    await expect(runUploadEvents(flagsReader, log)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The provided event log path 'non_existent_path' does not exist."`
    );
  });

  it('should log if eventLogPath is not provided and the SCOUT_REPORT_OUTPUT_ROOT directory does not exist', async () => {
    flagsReader.string.mockImplementation((flag) => {
      if (flag === 'eventLogPath') {
        return undefined;
      }
    });

    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    await runUploadEvents(flagsReader, log);

    expect(log.info).toHaveBeenCalledWith(
      'No Scout report output directory found at scout/reports/directory. No events to upload.'
    );
  });

  it('should upload the event log file', async () => {
    flagsReader.string.mockImplementation((flag) => {
      if (flag === 'eventLogPath') {
        return 'existing_event_log.ndjson';
      }
    });

    // assume the provided event log path exists
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    // the provided event log path is not a directory
    jest.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false,
    } as unknown as fs.Stats);

    await runUploadEvents(flagsReader, log);

    expect(mockAddEventsFromFile).toHaveBeenCalledWith('existing_event_log.ndjson');
  });
});
