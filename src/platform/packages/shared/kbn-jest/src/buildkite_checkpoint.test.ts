/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

import { execFile } from 'child_process';
import {
  isInBuildkite,
  getCheckpointKey,
  markConfigCompleted,
  isConfigCompleted,
} from './buildkite_checkpoint';

const mockExecFile = execFile as unknown as jest.Mock;

describe('buildkite_checkpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isInBuildkite', () => {
    it('returns true when BUILDKITE env var is set', () => {
      process.env.BUILDKITE = 'true';
      expect(isInBuildkite()).toBe(true);
    });

    it('returns false when BUILDKITE env var is not set', () => {
      delete process.env.BUILDKITE;
      expect(isInBuildkite()).toBe(false);
    });

    it('returns false when BUILDKITE is empty string', () => {
      process.env.BUILDKITE = '';
      expect(isInBuildkite()).toBe(false);
    });
  });

  describe('getCheckpointKey', () => {
    it('generates a deterministic key for the same config', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';
      process.env.BUILDKITE_PARALLEL_JOB = '2';

      const key1 = getCheckpointKey('path/to/config.js');
      const key2 = getCheckpointKey('path/to/config.js');
      expect(key1).toBe(key2);
    });

    it('generates different keys for different configs', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      const key1 = getCheckpointKey('config1.js');
      const key2 = getCheckpointKey('config2.js');
      expect(key1).not.toBe(key2);
    });

    it('includes step and job in the key prefix', () => {
      process.env.BUILDKITE_STEP_ID = 'step-abc';
      process.env.BUILDKITE_PARALLEL_JOB = '3';

      const key = getCheckpointKey('config.js');
      expect(key).toMatch(/^jest_ckpt_step-abc_3_/);
    });

    it('defaults to empty step and job 0 when env vars are missing', () => {
      delete process.env.BUILDKITE_STEP_ID;
      delete process.env.BUILDKITE_PARALLEL_JOB;

      const key = getCheckpointKey('config.js');
      expect(key).toMatch(/^jest_ckpt__0_/);
    });

    it('generates different keys for sharded vs non-sharded configs', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      const keyPlain = getCheckpointKey('config.js');
      const keyShard = getCheckpointKey('config.js||shard=1/2');
      expect(keyPlain).not.toBe(keyShard);
    });
  });

  describe('markConfigCompleted', () => {
    it('calls buildkite-agent meta-data set with the checkpoint key', async () => {
      process.env.BUILDKITE_STEP_ID = 'step-1';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, '');
      });

      await markConfigCompleted('config.js');

      expect(mockExecFile).toHaveBeenCalledWith(
        'buildkite-agent',
        ['meta-data', 'set', expect.stringMatching(/^jest_ckpt_/), 'done'],
        expect.any(Function)
      );
    });

    it('does not throw when buildkite-agent fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(new Error('agent not found'));
      });

      await expect(markConfigCompleted('config.js')).resolves.toBeUndefined();
    });
  });

  describe('isConfigCompleted', () => {
    it('returns true when meta-data value is "done"', async () => {
      process.env.BUILDKITE_STEP_ID = 'step-1';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, 'done');
      });

      const result = await isConfigCompleted('config.js');
      expect(result).toBe(true);
    });

    it('returns false when meta-data value is empty', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, '');
      });

      const result = await isConfigCompleted('config.js');
      expect(result).toBe(false);
    });

    it('returns false when buildkite-agent fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(new Error('agent not found'));
      });

      const result = await isConfigCompleted('config.js');
      expect(result).toBe(false);
    });

    it('passes --default empty string to handle missing keys', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, '');
      });

      await isConfigCompleted('config.js');

      expect(mockExecFile).toHaveBeenCalledWith(
        'buildkite-agent',
        expect.arrayContaining(['meta-data', 'get', '--default', '']),
        expect.any(Function)
      );
    });
  });
});
