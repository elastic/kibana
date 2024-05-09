/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { Writable } from 'stream';

import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CancellationToken } from '@kbn/reporting-common';
import type { LocatorParams } from '@kbn/reporting-common/types';
import type { TaskPayloadPNGV2 } from '@kbn/reporting-export-types-png-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { cryptoFactory } from '@kbn/reporting-server';
import { createMockScreenshottingStart } from '@kbn/screenshotting-plugin/server/mock';
import type { CaptureResult } from '@kbn/screenshotting-plugin/server/screenshots';
import { PngExportType } from '.';

let content: string;
let mockPngExportType: PngExportType;
let stream: jest.Mocked<Writable>;

const cancellationToken = new CancellationToken();
const taskInstanceFields = { startedAt: null, retryAt: null };
const mockLogger = loggingSystemMock.createLogger();

const mockEncryptionKey = 'abcabcsecuresecret';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};
let encryptedHeaders: string;

const screenshottingMock = createMockScreenshottingStart();
const getScreenshotsSpy = jest.spyOn(screenshottingMock, 'getScreenshots');
const testContent = 'raw string from get_screenhots';
const getBasePayload = (baseObj: unknown) => baseObj as TaskPayloadPNGV2;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;

  const configType = createMockConfigSchema({ encryptionKey: mockEncryptionKey });
  const context = coreMock.createPluginInitializerContext(configType);

  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();

  encryptedHeaders = await encryptHeaders({});

  mockPngExportType = new PngExportType(mockCoreSetup, configType, mockLogger, context);
  mockPngExportType.setup({
    basePath: { set: jest.fn() },
  });
  mockPngExportType.start({
    esClient: elasticsearchServiceMock.createClusterClient(),
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    screenshotting: screenshottingMock,
  });

  getScreenshotsSpy.mockImplementation((opts) => {
    const { logger } = opts;
    logger?.get('screenshotting');
    return Rx.of({
      metrics: { cpu: 0 },
      results: [{ screenshots: [{ data: Buffer.from(testContent) }] }] as CaptureResult['results'],
    });
  });
});

test(`passes browserTimezone to getScreenshots`, async () => {
  const browserTimezone = 'UTC';
  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      forceNow: 'test',
      layout: { dimensions: {} },
      locatorParams: [],
      browserTimezone,
      headers: encryptedHeaders,
    }),
    taskInstanceFields,
    cancellationToken,
    stream
  );

  expect(getScreenshotsSpy).toHaveBeenCalledWith(
    expect.objectContaining({ browserTimezone: 'UTC' })
  );
});

test(`returns content_type of application/png`, async () => {
  const { content_type: contentType } = await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      layout: { dimensions: {} },
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      headers: encryptedHeaders,
    }),
    taskInstanceFields,
    cancellationToken,
    stream
  );
  expect(contentType).toBe('image/png');
});

test(`returns buffer content base64 encoded`, async () => {
  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      layout: { dimensions: {} },
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      headers: encryptedHeaders,
    }),
    taskInstanceFields,
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});

test(`screenshotting plugin uses the logger provided by the PNG export-type`, async () => {
  const logSpy = jest.spyOn(mockLogger, 'get');

  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      layout: { dimensions: {} },
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      headers: encryptedHeaders,
    }),
    taskInstanceFields,
    cancellationToken,
    stream
  );

  expect(logSpy).toHaveBeenCalledWith('screenshotting');
});
