/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { Artifact } from '../artifact';
import { installArchive } from './install_archive';
import { installSnapshot } from './install_snapshot';

jest.mock('../artifact');
jest.mock('./install_archive');

const getSnapshotMock = Artifact.getSnapshot as jest.Mock;
const installArchiveMock = installArchive as jest.Mock;
const downloadMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getSnapshotMock.mockResolvedValue({
    spec: { filename: 'elasticsearch.tar.gz' },
    download: downloadMock,
  });
  installArchiveMock.mockResolvedValue({
    installPath: '/install',
    disableEsTmpDir: false,
    configPath: undefined,
  });
});

test('defaults to the established version directory under the base path', async () => {
  const basePath = '/base';

  await installSnapshot({ version: '9.6.0', basePath });

  expect(installArchiveMock).toHaveBeenCalledWith(
    path.resolve(basePath, 'cache', 'elasticsearch.tar.gz'),
    expect.objectContaining({
      installPath: path.resolve(basePath, '9.6.0'),
    })
  );
});
