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
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';

import { PngExportType } from '.';
import { generatePngObservable } from './generate_png';

jest.mock('./generate_png');

let content: string;
let mockPngExportType: PngExportType;
let stream: jest.Mocked<Writable>;

const cancellationToken = new CancellationToken();
const mockLogger = loggingSystemMock.createLogger();

const mockEncryptionKey = 'abcabcsecuresecret';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getBasePayload = (baseObj: unknown) => baseObj as TaskPayloadPNGV2;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;

  const configType = createMockConfigSchema({
    encryptionKey: mockEncryptionKey,
    queue: {
      indexInterval: 'daily',
      timeout: Infinity,
    },
  });

  const context = coreMock.createPluginInitializerContext(configType);

  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();

  mockPngExportType = new PngExportType(mockCoreSetup, configType, mockLogger, context);
  mockPngExportType.setup({
    basePath: { set: jest.fn() },
  });
  mockPngExportType.start({
    savedObjects: mockCoreStart.savedObjects,
    uiSettings: mockCoreStart.uiSettings,
    screenshotting: {} as unknown as ScreenshottingStart,
    esClient: elasticsearchServiceMock.createClusterClient(),
  });
});

afterEach(() => (generatePngObservable as jest.Mock).mockReset());

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('') }));

  const browserTimezone = 'UTC';
  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      forceNow: 'test',
      locatorParams: [],
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken,
    stream
  );

  expect(generatePngObservable).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      browserTimezone: 'UTC',
      headers: {},
      layout: { id: 'preserve_layout' },
    })
  );
});

test(`returns content_type of application/png`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from('foo') }));

  const { content_type: contentType } = await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      headers: encryptedHeaders,
    }),
    cancellationToken,
    stream
  );
  expect(contentType).toBe('image/png');
});

test(`returns content of generatePng getBuffer base64 encoded`, async () => {
  const testContent = 'raw string from get_screenhots';
  (generatePngObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const encryptedHeaders = await encryptHeaders({});
  await mockPngExportType.runTask(
    'pngJobId',
    getBasePayload({
      locatorParams: [{ version: 'test', id: 'test' }] as LocatorParams[],
      headers: encryptedHeaders,
    }),
    cancellationToken,
    stream
  );

  expect(content).toEqual(testContent);
});
