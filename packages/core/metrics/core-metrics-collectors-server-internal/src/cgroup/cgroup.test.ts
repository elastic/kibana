/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import mockFs from 'mock-fs';
import { loggerMock } from '@kbn/logging-mocks';
import { OsCgroupMetricsCollector } from '.';
import { Logger } from '@kbn/logging';
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
    mockFs.restore();
    jest.clearAllMocks();
  });

  it('returns empty object when no cgroup file present', async () => {
    mockFs({
      '/proc/self': {
        /** empty directory */
      },
    });

    expect(await collector.collect()).toEqual({});
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns empty object and logs error on an EACCES error', async () => {
    mockFs({
      '/proc/self/cgroup': `
123:memory:/groupname
123:cpu:/groupname
123:cpuacct:/groupname
      `,
      '/sys/fs/cgroup': mockFs.directory({ mode: parseInt('0000', 8) }),
    });

    expect(await collector.collect()).toEqual({});
    expect(logger.error).toHaveBeenCalledWith(
      "cgroup metrics could not be read due to error: [Error: EACCES, permission denied '/sys/fs/cgroup/cpuacct/groupname/cpuacct.usage']"
    );
  });

  it('delegates correctly to the v1 implementation', async () => {
    mockFs({
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
    mockFs({
      '/proc/self/cgroup': `0::/groupname`,
    });

    await collector.collect();

    expect(gatherV2CgroupMetrics).toHaveBeenCalledTimes(1);
    expect(gatherV2CgroupMetrics).toHaveBeenCalledWith('/groupname');
    expect(gatherV1CgroupMetrics).toHaveBeenCalledTimes(0);
  });

  it('passes through overrides', async () => {
    mockFs({
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
