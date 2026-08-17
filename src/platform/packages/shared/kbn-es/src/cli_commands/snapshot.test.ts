/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { Cluster } from '../cluster';
import { resolveCcmApiKey } from '../eis/eis_setup';
import { snapshot } from './snapshot';

jest.mock('@kbn/ci-stats-reporter', () => ({
  getTimeReporter: () => jest.fn(),
}));
jest.mock('../cluster');
jest.mock('../eis/eis_setup', () => ({
  EIS_ES_ARG: 'xpack.inference.eis.enabled=true',
  resolveCcmApiKey: jest.fn(),
  setCcmApiKey: jest.fn(),
}));

const ClusterMock = Cluster as jest.Mock;
const resolveCcmApiKeyMock = resolveCcmApiKey as jest.Mock;
const installSnapshotMock = jest.fn();
const originalArgv = process.argv;

beforeEach(() => {
  jest.clearAllMocks();
  ClusterMock.mockImplementation(() => ({
    installSnapshot: installSnapshotMock,
  }));
  installSnapshotMock.mockResolvedValue({
    installPath: '/install',
    disableEsTmpDir: false,
    configPath: undefined,
  });
});

afterEach(() => {
  process.argv = originalArgv;
});

test('--install-only uses the shared cache without resolving EIS runtime credentials', async () => {
  const basePath = '/base';
  process.argv = [
    'node',
    'scripts/es',
    'snapshot',
    '--install-only',
    '--eis',
    '--version',
    '9.6.0',
    '--base-path',
    basePath,
  ];

  await snapshot.run({});

  expect(resolveCcmApiKeyMock).not.toHaveBeenCalled();
  expect(installSnapshotMock).toHaveBeenCalledWith(
    expect.objectContaining({
      installPath: path.resolve(basePath, 'installs', '9.6.0'),
    })
  );
});
