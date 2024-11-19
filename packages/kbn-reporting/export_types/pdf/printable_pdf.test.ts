/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { Writable } from 'stream';

import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CancellationToken } from '@kbn/reporting-common';
import { TaskPayloadPDF } from '@kbn/reporting-export-types-pdf-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { cryptoFactory } from '@kbn/reporting-server';
import { createMockScreenshottingStart } from '@kbn/screenshotting-plugin/server/mock';

import { PdfV1ExportType } from '.';

let content: string;
let mockPdfExportType: PdfV1ExportType;
let stream: jest.Mocked<Writable>;

const cancellationToken = new CancellationToken();
const taskInstanceFields = { startedAt: null, retryAt: null };
const mockLogger = loggingSystemMock.createLogger();

const mockEncryptionKey = 'testencryptionkey';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const screenshottingMock = createMockScreenshottingStart();
const getScreenshotsSpy = jest.spyOn(screenshottingMock, 'getScreenshots');
const testContent = 'raw string from get_screenhots';
const getBasePayload = (baseObj: any) => baseObj as TaskPayloadPDF;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;
  const configType = createMockConfigSchema({ encryptionKey: mockEncryptionKey });
  const context = coreMock.createPluginInitializerContext(configType);

  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();

  mockPdfExportType = new PdfV1ExportType(mockCoreSetup, configType, mockLogger, context);

  mockPdfExportType.setup({
    basePath: { set: jest.fn() },
  });
  mockPdfExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    screenshotting: screenshottingMock,
  });
  getScreenshotsSpy.mockImplementation((opts) => {
    const { logger } = opts;
    logger?.get('screenshotting');
    return Rx.of({
      metrics: { cpu: 0, pages: 1 },
      data: Buffer.from(testContent),
      errors: [],
      renderErrors: [],
    });
  });
});

test(`passes browserTimezone to getScreenshots`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const browserTimezone = 'UTC';
  await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({
      browserTimezone,
      headers: encryptedHeaders,
      objects: [{ relativeUrl: '/app/kibana#/something' }],
    }),
    taskInstanceFields,
    cancellationToken,
    stream
  );

  expect(getScreenshotsSpy).toHaveBeenCalledWith(
    expect.objectContaining({ browserTimezone: 'UTC' })
  );
});

test(`returns content_type of application/pdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const { content_type: contentType } = await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({ objects: [], headers: encryptedHeaders }),
    taskInstanceFields,
    cancellationToken,
    stream
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns buffer content base64 encoded`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({ objects: [], headers: encryptedHeaders }),
    taskInstanceFields,
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});

test(`screenshotting plugin uses the logger provided by the PDF export-type`, async () => {
  const logSpy = jest.spyOn(mockLogger, 'get');

  const encryptedHeaders = await encryptHeaders({});
  await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({ objects: [], headers: encryptedHeaders }),
    taskInstanceFields,
    cancellationToken,
    stream
  );

  expect(logSpy).toHaveBeenCalledWith('screenshotting');
});
