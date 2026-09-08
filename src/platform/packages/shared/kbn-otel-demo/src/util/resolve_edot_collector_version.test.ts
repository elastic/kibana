/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { resolveEdotCollectorVersion } from './resolve_edot_collector_version';

jest.mock('execa', () => ({
  command: jest.fn(),
}));

jest.mock('@kbn/repo-info', () => ({
  kibanaPackageJson: { version: '9.1.0-SNAPSHOT' },
}));

const mockExecaCommand = execa.command as jest.MockedFunction<typeof execa.command>;

const mockLog: jest.Mocked<Pick<ToolingLog, 'debug' | 'warning'>> = {
  debug: jest.fn(),
  warning: jest.fn(),
};

const mockExecaResult = {} as execa.ExecaReturnValue<Buffer>;

describe('resolveEdotCollectorVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the current Kibana version when the image exists', async () => {
    mockExecaCommand.mockResolvedValueOnce(mockExecaResult);

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.1.0');
    expect(mockExecaCommand).toHaveBeenCalledTimes(1);
    expect(mockExecaCommand).toHaveBeenCalledWith(
      'docker manifest inspect docker.elastic.co/elastic-agent/elastic-otel-collector:9.1.0',
      expect.objectContaining({ timeout: 10000 })
    );
  });

  it('should walk back patch versions', async () => {
    mockExecaCommand
      .mockRejectedValueOnce(new Error('not found')) // 9.1.0
      .mockResolvedValueOnce(mockExecaResult); // 9.0.0

    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.1.0-SNAPSHOT' },
    }));

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.0.0');
    expect(mockExecaCommand).toHaveBeenCalledTimes(2);
  });

  it('should walk back minor versions when patch is 0', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.2.0-SNAPSHOT' },
    }));

    mockExecaCommand
      .mockRejectedValueOnce(new Error('not found')) // 9.2.0
      .mockRejectedValueOnce(new Error('not found')) // 9.1.0
      .mockResolvedValueOnce(mockExecaResult); // 9.0.0

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.0.0');
    expect(mockExecaCommand).toHaveBeenCalledTimes(3);
  });

  it('should cross major boundary with minor set to 20', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '10.0.0-SNAPSHOT' },
    }));

    mockExecaCommand
      .mockRejectedValueOnce(new Error('not found')) // 10.0.0
      .mockRejectedValueOnce(new Error('not found')) // 9.20.0
      .mockResolvedValueOnce(mockExecaResult); // 9.19.0

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.19.0');
    expect(mockExecaCommand).toHaveBeenCalledTimes(3);
    expect(mockExecaCommand).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(':9.20.0'),
      expect.anything()
    );
  });

  it('should strip -SNAPSHOT suffix from Kibana version', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.1.0-SNAPSHOT' },
    }));

    mockExecaCommand.mockResolvedValueOnce(mockExecaResult);

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.1.0');
    expect(mockExecaCommand).toHaveBeenCalledWith(
      expect.not.stringContaining('SNAPSHOT'),
      expect.anything()
    );
  });

  it('should fall back to Kibana version when no image is found', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '1.0.0' },
    }));

    mockExecaCommand.mockRejectedValue(new Error('not found'));

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('1.0.0');
    expect(mockLog.warning).toHaveBeenCalledWith(expect.stringContaining('falling back to 1.0.0'));
  });

  it('should walk back patch before minor', async () => {
    jest.resetModules();
    jest.doMock('@kbn/repo-info', () => ({
      kibanaPackageJson: { version: '9.1.2' },
    }));

    mockExecaCommand
      .mockRejectedValueOnce(new Error('not found')) // 9.1.2
      .mockRejectedValueOnce(new Error('not found')) // 9.1.1
      .mockResolvedValueOnce(mockExecaResult); // 9.1.0

    const version = await resolveEdotCollectorVersion(mockLog as unknown as ToolingLog);

    expect(version).toBe('9.1.0');
    expect(mockExecaCommand).toHaveBeenCalledTimes(3);
  });
});
