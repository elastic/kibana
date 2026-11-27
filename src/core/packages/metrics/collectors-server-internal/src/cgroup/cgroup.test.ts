/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./v1', () => {
  const actual = jest.requireActual('./v1');
  return {
    ...actual,
    gatherV1CgroupMetrics: jest.fn(actual.gatherV1CgroupMetrics),
  };
});

jest.mock('./v2', () => {
  const actual = jest.requireActual('./v2');
  return {
    ...actual,
    gatherV2CgroupMetrics: jest.fn(actual.gatherV2CgroupMetrics),
  };
});

import { createFsError, mockCgroupFiles, readFileMock } from './cgroup_files.test.mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { OsCgroupMetricsCollector } from '.';
import type { Logger } from '@kbn/logging';
import { gatherV1CgroupMetrics } from './v1';
import { gatherV2CgroupMetrics } from './v2';

describe('OsCgroupMetricsCollector', () => {
  let collector: OsCgroupMetricsCollector;
  let logger: Logger;
  beforeEach(() => {
    logger = loggerMock.create();
    collector = new OsCgroupMetricsCollector({ logger });
  });
  afterEach(() => {
    readFileMock.mockReset();
    jest.clearAllMocks();
  });

  it('returns empty object when no cgroup file present', async () => {
    mockCgroupFiles({});

    expect(await collector.collect()).toEqual({});
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns empty object and logs error on an EACCES error', async () => {
    // Every file under /sys/fs/cgroup is unreadable.
    readFileMock.mockImplementation(async (path) => {
      if (path === '/proc/self/cgroup') {
        return Buffer.from(`
123:memory:/groupname
123:cpu:/groupname
123:cpuacct:/groupname
      `);
      }
      throw createFsError('EACCES', 'permission denied', String(path));
    });

    expect(await collector.collect()).toEqual({});
    expect(logger.error).toHaveBeenCalledWith(
      "cgroup metrics could not be read due to error: [Error: EACCES: permission denied, open '/sys/fs/cgroup/cpuacct/groupname/cpuacct.usage']"
    );
  });

  it('delegates correctly to the v1 implementation', async () => {
    mockCgroupFiles({
      '/proc/self/cgroup': `123:memory:/groupname
123:cpu:/groupname
123:cpuacct:/groupname`,
    });

    await collector.collect();

    expect(gatherV1CgroupMetrics).toHaveBeenCalledTimes(1);
    expect(gatherV1CgroupMetrics).toHaveBeenCalledWith({
      cpuAcctPath: '/groupname',
      cpuPath: '/groupname',
    });
    expect(gatherV2CgroupMetrics).toHaveBeenCalledTimes(0);
  });

  it('delegates correctly to the v2 implementation', async () => {
    mockCgroupFiles({
      '/proc/self/cgroup': `0::/groupname`,
    });

    await collector.collect();

    expect(gatherV2CgroupMetrics).toHaveBeenCalledTimes(1);
    expect(gatherV2CgroupMetrics).toHaveBeenCalledWith('/groupname');
    expect(gatherV1CgroupMetrics).toHaveBeenCalledTimes(0);
  });

  it('passes through overrides', async () => {
    mockCgroupFiles({
      '/proc/self/cgroup': `0:test:/groupname`,
    });

    logger = loggerMock.create();
    collector = new OsCgroupMetricsCollector({
      logger,
      cpuAcctPath: '/override1',
      cpuPath: '/override2',
    });

    await collector.collect();

    expect(gatherV1CgroupMetrics).toHaveBeenCalledWith({
      cpuAcctPath: '/override1',
      cpuPath: '/override2',
    });
  });
});
