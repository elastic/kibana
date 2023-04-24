/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from '@kbn/core/server';
import { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import * as stream from 'stream';
import { File } from '../common';
import { FileClient, FileServiceFactory, FileServiceStart, FilesSetup } from '.';

export const createFileServiceMock = (): DeeplyMockedKeys<FileServiceStart> => ({
  create: jest.fn(),
  delete: jest.fn(),
  bulkDelete: jest.fn(),
  deleteShareObject: jest.fn(),
  find: jest.fn(),
  getById: jest.fn(),
  getByToken: jest.fn(),
  getShareObject: jest.fn(),
  getUsageMetrics: jest.fn(),
  listShareObjects: jest.fn(),
  update: jest.fn(),
  updateShareObject: jest.fn(),
});

export const createFileServiceFactoryMock = (): DeeplyMockedKeys<FileServiceFactory> => ({
  asInternal: jest.fn(createFileServiceMock),
  asScoped: jest.fn((_: KibanaRequest) => createFileServiceMock()),
});

export const createFileMock = (): DeeplyMockedKeys<File> => {
  const fileMock: DeeplyMockedKeys<File> = {
    id: '123',
    data: {
      id: '123',
      created: '2022-10-10T14:57:30.682Z',
      updated: '2022-10-19T14:43:20.112Z',
      name: 'test.txt',
      mimeType: 'text/plain',
      size: 1234,
      extension: '.txt',
      meta: {},
      alt: undefined,
      fileKind: 'none',
      status: 'READY',
    },
    update: jest.fn(),
    uploadContent: jest.fn(),
    downloadContent: jest.fn().mockResolvedValue(new stream.Readable()),
    delete: jest.fn(),
    share: jest.fn(),
    listShares: jest.fn(),
    unshare: jest.fn(),
    toJSON: jest.fn(),
  };

  fileMock.update.mockResolvedValue(fileMock);
  fileMock.uploadContent.mockResolvedValue(fileMock);

  return fileMock;
};

export const createFileClientMock = (): DeeplyMockedKeys<FileClient> => {
  const fileMock = createFileMock();

  return {
    fileKind: 'none',
    create: jest.fn().mockResolvedValue(fileMock),
    get: jest.fn().mockResolvedValue(fileMock),
    update: jest.fn(),
    delete: jest.fn(),
    find: jest.fn().mockResolvedValue({ files: [fileMock], total: 1 }),
    share: jest.fn(),
    unshare: jest.fn(),
    listShares: jest.fn().mockResolvedValue({ shares: [] }),
  };
};

export const createFilesSetupMock = (): DeeplyMockedKeys<FilesSetup> => {
  return {
    registerFileKind: jest.fn(),
  };
};
