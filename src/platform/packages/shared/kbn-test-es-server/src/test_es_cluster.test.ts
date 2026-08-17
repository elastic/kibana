/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { Cluster } from '@kbn/es';
import { ToolingLog } from '@kbn/tooling-log';
import { createTestEsCluster } from './test_es_cluster';

jest.mock('@kbn/es', () => ({
  Cluster: jest.fn(),
  getEsInstallPath: (basePath: string, version: string) =>
    jest.requireActual('path').resolve(basePath, 'installs', version),
}));

const ClusterMock = Cluster as jest.Mock;
const installSourceMock = jest.fn();
const startMock = jest.fn();
let basePath: string;

beforeEach(() => {
  jest.clearAllMocks();
  basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-test-es-server-'));
  ClusterMock.mockImplementation(() => ({
    installSource: installSourceMock,
    start: startMock,
  }));
  installSourceMock.mockResolvedValue({
    installPath: path.resolve(basePath, 'installs', 'source'),
    disableEsTmpDir: false,
    configPath: path.resolve(basePath, 'runtime', 'es-test-cluster', 'config'),
  });
  startMock.mockResolvedValue(undefined);
});

afterEach(() => {
  fs.rmSync(basePath, { recursive: true, force: true });
});

test('source test clusters use an install isolated from the mutable CLI install', async () => {
  const cluster = createTestEsCluster({
    basePath,
    esFrom: 'source',
    log: new ToolingLog(),
  });

  await cluster.start();

  expect(installSourceMock).toHaveBeenCalledWith(
    expect.objectContaining({
      installPath: path.resolve(basePath, 'installs', 'source'),
    })
  );
});
