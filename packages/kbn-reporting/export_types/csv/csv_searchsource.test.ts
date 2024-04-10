/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('@kbn/generate-csv', () => ({
  CsvGenerator: class CsvGeneratorMock {
    generateData() {
      return {
        size: 123,
        content_type: 'text/csv',
      };
    }
  },
}));

import nodeCrypto from '@elastic/node-crypto';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { createFieldFormatsStartMock } from '@kbn/field-formats-plugin/server/mocks';
import { CancellationToken } from '@kbn/reporting-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { setFieldFormats } from '@kbn/reporting-server';
import { Writable } from 'stream';

import { CsvSearchSourceExportType } from '.';

const mockLogger = loggingSystemMock.createLogger();
const encryptionKey = 'tetkey';
const headers = { sid: 'cooltestheaders' };
const taskInstanceFields = { startedAt: null, retryAt: null };
let encryptedHeaders: string;
let stream: jest.Mocked<Writable>;
let mockCsvSearchSourceExportType: CsvSearchSourceExportType;

beforeAll(async () => {
  // use fieldFormats plugin for csv formats
  // normally, this is done in the Reporting plugin
  setFieldFormats(createFieldFormatsStartMock());

  const crypto = nodeCrypto({ encryptionKey });

  encryptedHeaders = await crypto.encrypt(headers);
  const configType = createMockConfigSchema({
    encryptionKey,
    csv: {
      checkForFormulas: true,
      escapeFormulaValues: true,
      maxSizeBytes: 180000,
      scroll: { size: 500, duration: '30s' },
    },
  });
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const context = coreMock.createPluginInitializerContext(configType);

  mockCsvSearchSourceExportType = new CsvSearchSourceExportType(
    mockCoreSetup,
    configType,
    mockLogger,
    context
  );

  mockCsvSearchSourceExportType.setup({
    basePath: { set: jest.fn() },
  });

  mockCsvSearchSourceExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    discover: discoverPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
  });
});

beforeEach(() => {
  stream = {} as typeof stream;
});

test('gets the csv content from job parameters', async () => {
  const payload = await mockCsvSearchSourceExportType.runTask(
    'cool-job-id',
    {
      headers: encryptedHeaders,
      browserTimezone: 'US/Alaska',
      searchSource: {},
      objectType: 'search',
      title: 'Test Search',
      version: '7.13.0',
    },
    taskInstanceFields,
    new CancellationToken(),
    stream
  );

  expect(payload).toMatchInlineSnapshot(`
        Object {
          "content_type": "text/csv",
          "size": 123,
        }
      `);
});

test('uses the provided logger', async () => {
  const logSpy = jest.spyOn(mockLogger, 'get');

  await mockCsvSearchSourceExportType.runTask(
    'cool-job-id',
    {
      headers: encryptedHeaders,
      browserTimezone: 'US/Alaska',
      searchSource: {},
      objectType: 'search',
      title: 'Test Search',
      version: '7.13.0',
    },
    taskInstanceFields,
    new CancellationToken(),
    stream
  );

  expect(logSpy).toHaveBeenCalledWith('execute-job:cool-job-id');
});
