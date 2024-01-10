/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { Writable } from 'stream';

import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CancellationToken } from '@kbn/reporting-common';
import type { LocatorParams } from '@kbn/reporting-common/types';
import type { TaskPayloadPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { cryptoFactory } from '@kbn/reporting-server';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';

import { PdfExportType } from '.';
import { generatePdfObservableV2 } from './generate_pdf_v2';

jest.mock('./generate_pdf_v2');

let content: string;
let mockPdfExportType: PdfExportType;
let stream: jest.Mocked<Writable>;

const cancellationToken = new CancellationToken();
const mockLogger = loggingSystemMock.createLogger();

const mockEncryptionKey = 'testencryptionkey';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: any) =>
  ({
    params: { forceNow: 'test' },
    ...baseObj,
  } as TaskPayloadPDFV2);

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;

  const configType = createMockConfigSchema({ encryptionKey: mockEncryptionKey });
  const context = coreMock.createPluginInitializerContext(configType);

  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  mockPdfExportType = new PdfExportType(mockCoreSetup, configType, mockLogger, context);

  mockPdfExportType.setup({
    basePath: { set: jest.fn() },
  });
  mockPdfExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    screenshotting: {} as unknown as ScreenshottingStart,
  });
});

afterEach(() => (generatePdfObservableV2 as jest.Mock).mockReset());

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  (generatePdfObservableV2 as jest.Mock).mockReturnValue(of(Buffer.from('')));

  const browserTimezone = 'UTC';
  await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({
      forceNow: 'test',
      title: 'PDF Params Timezone Test',
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken,
    stream
  );

  expect(generatePdfObservableV2).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.objectContaining({ browserTimezone: 'UTC' })
  );
});

test(`returns content_type of application/pdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  (generatePdfObservableV2 as jest.Mock).mockReturnValue(of({ buffer: Buffer.from('') }));

  const { content_type: contentType } = await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({ locatorParams: [], headers: encryptedHeaders }),
    cancellationToken,
    stream
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';
  (generatePdfObservableV2 as jest.Mock).mockReturnValue(of({ buffer: Buffer.from(testContent) }));

  const encryptedHeaders = await encryptHeaders({});
  await mockPdfExportType.runTask(
    'pdfJobId',
    getBasePayload({ locatorParams: [], headers: encryptedHeaders }),
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
