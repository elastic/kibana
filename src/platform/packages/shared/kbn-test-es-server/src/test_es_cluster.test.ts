/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

const mockInstallSource = jest.fn();
const mockInstallSnapshot = jest.fn();
const mockNodeStart = jest.fn();

// The real `Cluster` builds/downloads Elasticsearch and spawns a JVM, so it is
// mocked to only record how `TestCluster` asks it to install and start nodes.
jest.mock('@kbn/es', () => ({
  Cluster: jest.fn().mockImplementation(() => ({
    installSource: mockInstallSource,
    installSnapshot: mockInstallSnapshot,
    start: mockNodeStart,
  })),
}));

import { createTestEsCluster } from './test_es_cluster';

const log = new ToolingLog();
const files = ['/path/to/roles.yml', '/path/to/idp_metadata.xml'];

beforeEach(() => {
  jest.clearAllMocks();
  mockInstallSource.mockResolvedValue({ installPath: '/install/source', disableEsTmpDir: false });
  mockInstallSnapshot.mockResolvedValue({
    installPath: '/install/snapshot',
    disableEsTmpDir: false,
  });
  mockNodeStart.mockResolvedValue(undefined);
});

describe('createTestEsCluster', () => {
  it('passes `files` as resources when installing from source', async () => {
    await createTestEsCluster({ log, esFrom: 'source', files }).start();

    expect(mockInstallSource).toHaveBeenCalledTimes(1);
    expect(mockInstallSource).toHaveBeenCalledWith(expect.objectContaining({ resources: files }));
    expect(mockNodeStart).toHaveBeenCalledWith('/install/source', expect.anything());
  });

  it('passes `files` as resources when installing from snapshot', async () => {
    await createTestEsCluster({ log, esFrom: 'snapshot', files }).start();

    expect(mockInstallSnapshot).toHaveBeenCalledTimes(1);
    expect(mockInstallSnapshot).toHaveBeenCalledWith(expect.objectContaining({ resources: files }));
    expect(mockNodeStart).toHaveBeenCalledWith('/install/snapshot', expect.anything());
  });
});
