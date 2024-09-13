/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CsvGenerator } from '@kbn/generate-csv';

jest.mock('@kbn/generate-csv', () => {
  return {
    CsvGenerator: jest.fn().mockImplementation(() => {
      return { generateData: jest.fn() };
    }),
  };
});

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { createFieldFormatsStartMock } from '@kbn/field-formats-plugin/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { setFieldFormats } from '@kbn/reporting-server';
import type { Writable } from 'stream';

import { CsvSearchSourceImmediateExportType } from '.';
import { ReportingRequestHandlerContext } from './types';

const mockLogger = loggingSystemMock.createLogger();
const encryptionKey = 'tetkey';
let stream: jest.Mocked<Writable>;
let mockCsvSearchSourceImmediateExportType: CsvSearchSourceImmediateExportType;
let mockCoreStart: CoreStart;
let mockRequest: KibanaRequest<any, any, any, any>;
let mockRequestHandlerContext: ReportingRequestHandlerContext;

beforeEach(async () => {
  // use fieldFormats plugin for csv formats
  // normally, this is done in the Reporting plugin
  setFieldFormats(createFieldFormatsStartMock());
  stream = {} as typeof stream;

  const configType = createMockConfigSchema({
    encryptionKey,
    csv: {
      checkForFormulas: true,
      escapeFormulaValues: true,
      maxSizeBytes: 180000,
      scroll: { size: 500, duration: 'auto' },
    },
  });
  const mockCoreSetup = coreMock.createSetup();
  mockCoreStart = coreMock.createStart();
  const context = coreMock.createPluginInitializerContext(configType);
  mockRequest = httpServerMock.createKibanaRequest();

  mockCsvSearchSourceImmediateExportType = new CsvSearchSourceImmediateExportType(
    mockCoreSetup,
    configType,
    mockLogger,
    context
  );

  mockRequestHandlerContext = {
    core: Promise.resolve(mockCoreStart),
  } as unknown as ReportingRequestHandlerContext;

  mockCsvSearchSourceImmediateExportType.setup({
    basePath: { set: jest.fn() },
  });

  mockCsvSearchSourceImmediateExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    discover: discoverPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
  });

  jest.useFakeTimers();
  jest.setSystemTime(1630526670000);
});

afterEach(() => {
  jest.useRealTimers();
});

test('allows csv.scroll.duration to be "auto"', async () => {
  const mockGenerateData = jest.fn().mockResolvedValue(() => ({ csv_contains_formulas: false }));
  (CsvGenerator as jest.Mock).mockImplementationOnce(() => {
    return { generateData: mockGenerateData };
  });

  await mockCsvSearchSourceImmediateExportType.runTask(
    'cool-job-id',
    { browserTimezone: 'US/Alaska', searchSource: {}, title: 'Test Search' },
    mockRequestHandlerContext,
    stream,
    mockRequest
  );

  expect(CsvGenerator).toBeCalledWith(
    {
      browserTimezone: 'US/Alaska',
      objectType: 'immediate-search',
      searchSource: {},
      title: 'Test Search',
    },
    {
      checkForFormulas: true,
      escapeFormulaValues: true,
      maxSizeBytes: 180000,
      scroll: { duration: 'auto', size: 500 },
    },
    {
      retryAt: new Date('2021-09-01T20:06:30.000Z'),
      startedAt: new Date('2021-09-01T20:04:30.000Z'),
    },
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything()
  );

  expect(mockGenerateData).toBeCalled();
});
