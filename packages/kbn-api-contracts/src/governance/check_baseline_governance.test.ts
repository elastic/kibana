/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { checkBaselineGovernance } from './check_baseline_governance';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('checkBaselineGovernance', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('when not in PR context', () => {
    it('allows all changes', () => {
      delete process.env.GITHUB_PR_NUMBER;

      const result = checkBaselineGovernance('serverless', '/path/to/baseline.yaml');

      expect(result.allowed).toBe(true);
    });
  });

  describe('when in PR context', () => {
    beforeEach(() => {
      process.env.GITHUB_PR_NUMBER = '123';
      process.env.GITHUB_PR_MERGE_BASE = 'abc123';
    });

    it('allows when baseline is not modified', () => {
      mockExecSync.mockReturnValue('src/some/other/file.ts\n');

      const result = checkBaselineGovernance('stack', '/path/to/baseline.yaml');

      expect(result.allowed).toBe(true);
    });

    describe('serverless baseline', () => {
      it('blocks modifications', () => {
        const baselinePath = `${process.cwd()}/packages/kbn-api-contracts/baselines/serverless/current.yaml`;
        mockExecSync.mockReturnValue(
          'packages/kbn-api-contracts/baselines/serverless/current.yaml\n'
        );

        const result = checkBaselineGovernance('serverless', baselinePath);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('post-promotion pipeline');
      });
    });

    describe('stack baseline', () => {
      const baselinePath = `${process.cwd()}/packages/kbn-api-contracts/baselines/stack/9.1.yaml`;

      beforeEach(() => {
        mockExecSync.mockReturnValue('packages/kbn-api-contracts/baselines/stack/9.1.yaml\n');
      });

      it('blocks modifications without label', () => {
        process.env.GITHUB_PR_LABELS = 'some-other-label';

        const result = checkBaselineGovernance('stack', baselinePath);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('breaking-change-approved');
      });

      it('allows modifications with label', () => {
        process.env.GITHUB_PR_LABELS = 'some-label,breaking-change-approved,another-label';

        const result = checkBaselineGovernance('stack', baselinePath);

        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('when merge base cannot be determined', () => {
    it('allows all changes', () => {
      process.env.GITHUB_PR_NUMBER = '123';
      delete process.env.GITHUB_PR_MERGE_BASE;
      delete process.env.GITHUB_PR_TARGET_BRANCH;

      const result = checkBaselineGovernance('serverless', '/path/to/baseline.yaml');

      expect(result.allowed).toBe(true);
    });
  });
});
