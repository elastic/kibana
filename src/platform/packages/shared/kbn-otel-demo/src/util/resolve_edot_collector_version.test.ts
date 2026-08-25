/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { execa, type Result } from 'execa';
import { resolveEdotCollectorVersion } from './resolve_edot_collector_version';

jest.mock('execa', () => ({
  execa: jest.fn(),
  parseCommandString: (command: string) => command.split(' '),
}));

jest.mock('@kbn/repo-info', () => ({
  kibanaPackageJson: { version: '9.1.0-SNAPSHOT' },
}));

const mockExeca = execa as jest.MockedFunction<typeof execa>;

const mockLog: jest.Mocked<Pick<ToolingLog, 'debug' | 'warning'>> = {
  debug: jest.fn(),
  warning: jest.fn(),
};

const mockExecaResult = {} as Result;

describe('resolveEdotCollectorVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the current Kibana version when the image exists', async () => {
    mockExeca.mockResolvedValueOnce(mockExecaResult);

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.1.0');
    expect(mockExeca).toHaveBeenCalledTimes(1);
    expect(mockExeca).toHaveBeenCalledWith(
      'docker',
      ['manifest', 'inspect', 'docker.elastic.co/elastic-agent/elastic-otel-collector:9.1.0'],
      expect.objectContaining({ timeout: 10000 })
    );
  });

  it('should walk back patch versions', async () => {
    mockExeca
      .mockRejectedValueOnce(new Error('not found')) // 9.1.0
      .mockResolvedValueOnce(mockExecaResult); // 9.0.0

    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.1.0-SNAPSHOT' },
    }));

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.0.0');
    expect(mockExeca).toHaveBeenCalledTimes(2);
  });

  it('should walk back minor versions when patch is 0', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.2.0-SNAPSHOT' },
    }));

    mockExeca
      .mockRejectedValueOnce(new Error('not found')) // 9.2.0
      .mockRejectedValueOnce(new Error('not found')) // 9.1.0
      .mockResolvedValueOnce(mockExecaResult); // 9.0.0

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.0.0');
    expect(mockExeca).toHaveBeenCalledTimes(3);
  });

  it('should cross major boundary with minor set to 20', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '10.0.0-SNAPSHOT' },
    }));

    mockExeca
      .mockRejectedValueOnce(new Error('not found')) // 10.0.0
      .mockRejectedValueOnce(new Error('not found')) // 9.20.0
      .mockResolvedValueOnce(mockExecaResult); // 9.19.0

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.19.0');
    expect(mockExeca).toHaveBeenCalledTimes(3);
    expect(mockExeca).toHaveBeenNthCalledWith(
      2,
      'docker',
      ['manifest', 'inspect', 'docker.elastic.co/elastic-agent/elastic-otel-collector:9.20.0'],
      expect.anything()
    );
  });

  it('should strip -SNAPSHOT suffix from Kibana version', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.1.0-SNAPSHOT' },
    }));

    mockExeca.mockResolvedValueOnce(mockExecaResult);

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.1.0');
    expect(mockExeca).toHaveBeenCalledWith(
      'docker',
      ['manifest', 'inspect', 'docker.elastic.co/elastic-agent/elastic-otel-collector:9.1.0'],
      expect.anything()
    );
  });

  it('should fall back to Kibana version when no image is found', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '1.0.0' },
    }));

    mockExeca.mockRejectedValue(new Error('not found'));

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('1.0.0');
    expect(mockLog.warning).toHaveBeenCalledWith(expect.stringContaining('falling back to 1.0.0'));
  });

  it('should walk back patch before minor', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.1.2' },
    }));

    mockExeca
      .mockRejectedValueOnce(new Error('not found')) // 9.1.2
      .mockRejectedValueOnce(new Error('not found')) // 9.1.1
      .mockResolvedValueOnce(mockExecaResult); // 9.1.0

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.1.0');
    expect(mockExeca).toHaveBeenCalledTimes(3);
  });
});
