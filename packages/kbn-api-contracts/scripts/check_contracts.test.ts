/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
}));

jest.mock('../src/diff/run_bump_diff', () => ({
  runBumpDiff: jest.fn(),
  BumpServiceError: class BumpServiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BumpServiceError';
    }
  },
}));

jest.mock('../src/diff/parse_bump_diff', () => ({
  parseBumpDiff: jest.fn(),
}));

jest.mock('../src/terraform/check_terraform_impact', () => ({
  checkTerraformImpact: jest.fn(),
}));

jest.mock('../src/allowlist/load_allowlist', () => ({
  loadAllowlist: jest.fn(),
}));

jest.mock('../src/diff/breaking_rules', () => ({
  applyAllowlist: jest.fn(),
}));

jest.mock('../src/report/format_failure', () => ({
  formatFailure: jest.fn(),
}));

import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { runBumpDiff } from '../src/diff/run_bump_diff';
import { BumpServiceError } from '../src/diff/errors';
import { parseBumpDiff } from '../src/diff/parse_bump_diff';
import { checkTerraformImpact } from '../src/terraform/check_terraform_impact';
import { loadAllowlist } from '../src/allowlist/load_allowlist';
import { applyAllowlist } from '../src/diff/breaking_rules';
import { formatFailure } from '../src/report/format_failure';
import type { BreakingChange } from '../src/diff/breaking_rules';

const mockRun = jest.requireMock('@kbn/dev-cli-runner').run as jest.Mock;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockRunBumpDiff = runBumpDiff as jest.MockedFunction<typeof runBumpDiff>;
const mockParseBumpDiff = parseBumpDiff as jest.MockedFunction<typeof parseBumpDiff>;
const mockCheckTerraformImpact = checkTerraformImpact as jest.MockedFunction<
  typeof checkTerraformImpact
>;
const mockLoadAllowlist = loadAllowlist as jest.MockedFunction<typeof loadAllowlist>;
const mockApplyAllowlist = applyAllowlist as jest.MockedFunction<typeof applyAllowlist>;
const mockFormatFailure = formatFailure as jest.MockedFunction<typeof formatFailure>;

describe('check_contracts', () => {
  let runCallback: (args: { flags: Record<string, unknown>; log: MockLog }) => Promise<void>;
  let mockLog: MockLog;

  interface MockLog {
    info: jest.Mock;
    warning: jest.Mock;
    success: jest.Mock;
    error: jest.Mock;
  }

  beforeAll(() => {
    require('./check_contracts');
    runCallback = mockRun.mock.calls[0][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = {
      info: jest.fn(),
      warning: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
    };
    mockExecSync.mockReturnValue('openapi: 3.0.0\npaths: {}');
  });

  const defaultFlags = {
    distribution: 'stack',
    specPath: 'oas_docs/output/kibana.yaml',
    baseBranch: 'main',
  };

  const gitRemoteOutput = [
    'upstream\tgit@github.com:elastic/kibana.git (fetch)',
    'upstream\tgit@github.com:elastic/kibana.git (push)',
    'origin\tgit@github.com:myuser/kibana.git (fetch)',
    'origin\tgit@github.com:myuser/kibana.git (push)',
  ].join('\n');

  it('throws if distribution is missing', async () => {
    await expect(
      runCallback({ flags: { ...defaultFlags, distribution: undefined }, log: mockLog })
    ).rejects.toThrow('--distribution must be either "stack" or "serverless"');
  });

  it('throws if distribution is invalid', async () => {
    await expect(
      runCallback({ flags: { ...defaultFlags, distribution: 'invalid' }, log: mockLog })
    ).rejects.toThrow('--distribution must be either "stack" or "serverless"');
  });

  it('skips check when base OAS does not exist on base branch', async () => {
    const fileNotFoundError = new Error('git show failed');
    (fileNotFoundError as any).stderr = Buffer.from(
      "fatal: path 'oas_docs/output/kibana.yaml' does not exist in 'abc123'\n"
    );

    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git remote -v') return gitRemoteOutput;
      if (typeof cmd === 'string' && cmd.startsWith('git fetch')) return '';
      throw fileNotFoundError;
    });

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.warning).toHaveBeenCalledWith('No base OAS found - skipping check');
    expect(mockRunBumpDiff).not.toHaveBeenCalled();
  });

  it('throws when git show fails for unexpected reasons', async () => {
    const unexpectedError = new Error('ENOBUFS');
    (unexpectedError as any).stderr = Buffer.from('spawnSync /bin/sh ENOBUFS');

    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git remote -v') return gitRemoteOutput;
      if (typeof cmd === 'string' && cmd.startsWith('git fetch')) return '';
      throw unexpectedError;
    });

    await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow('ENOBUFS');
    expect(mockRunBumpDiff).not.toHaveBeenCalled();
  });

  it('reports success when no breaking changes', async () => {
    mockRunBumpDiff.mockReturnValue([]);
    mockParseBumpDiff.mockReturnValue([]);

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.success).toHaveBeenCalledWith('No breaking changes detected');
  });

  it('reports success when breaking changes do not affect terraform', async () => {
    const changes: BreakingChange[] = [
      { type: 'path_removed', path: '/api/some/internal', reason: 'Endpoint removed' },
    ];
    mockRunBumpDiff.mockReturnValue([]);
    mockParseBumpDiff.mockReturnValue(changes);
    mockCheckTerraformImpact.mockReturnValue({ hasImpact: false, impactedChanges: [] });

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.success).toHaveBeenCalledWith(
      expect.stringContaining('none affect Terraform provider APIs')
    );
  });

  it('reports success when all TF-impacting changes are allowlisted', async () => {
    const changes: BreakingChange[] = [
      { type: 'path_removed', path: '/api/spaces/space', reason: 'Endpoint removed' },
    ];
    mockRunBumpDiff.mockReturnValue([]);
    mockParseBumpDiff.mockReturnValue(changes);
    mockCheckTerraformImpact.mockReturnValue({
      hasImpact: true,
      impactedChanges: [{ change: changes[0], terraformResource: 'elasticstack_kibana_space' }],
    });
    mockLoadAllowlist.mockReturnValue({ entries: [] });
    mockApplyAllowlist.mockReturnValue({ breakingChanges: [], allowlistedChanges: changes });

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.success).toHaveBeenCalledWith(
      'All Terraform-impacting breaking changes are allowlisted'
    );
  });

  it('throws when unallowlisted TF-impacting breaking changes exist', async () => {
    const changes: BreakingChange[] = [
      { type: 'path_removed', path: '/api/spaces/space', reason: 'Endpoint removed' },
    ];
    const terraformImpact = {
      hasImpact: true,
      impactedChanges: [{ change: changes[0], terraformResource: 'elasticstack_kibana_space' }],
    };
    mockRunBumpDiff.mockReturnValue([]);
    mockParseBumpDiff.mockReturnValue(changes);
    mockCheckTerraformImpact.mockReturnValue(terraformImpact);
    mockLoadAllowlist.mockReturnValue({ entries: [] });
    mockApplyAllowlist.mockReturnValue({ breakingChanges: changes, allowlistedChanges: [] });
    mockFormatFailure.mockReturnValue('FAILURE REPORT');

    await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
      'Found 1 breaking change(s) affecting Terraform provider APIs'
    );

    expect(mockFormatFailure).toHaveBeenCalledWith(changes, terraformImpact);
    expect(mockLog.error).toHaveBeenCalledWith('FAILURE REPORT');
  });

  it('uses default specPath based on distribution', async () => {
    mockRunBumpDiff.mockReturnValue([]);
    mockParseBumpDiff.mockReturnValue([]);

    await runCallback({
      flags: { distribution: 'serverless', baseBranch: 'main' },
      log: mockLog,
    });

    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('kibana.serverless.yaml'));
  });

  describe('merge base (CI path)', () => {
    it('uses git show with merge base SHA when --mergeBase is provided', async () => {
      mockRunBumpDiff.mockReturnValue([]);
      mockParseBumpDiff.mockReturnValue([]);

      await runCallback({
        flags: { ...defaultFlags, mergeBase: 'abc123def' },
        log: mockLog,
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        'git show abc123def:oas_docs/output/kibana.yaml',
        expect.any(Object)
      );
      expect(mockLog.info).toHaveBeenCalledWith('Using merge base: abc123def');
    });

    it('does not resolve remote when mergeBase is provided', async () => {
      mockRunBumpDiff.mockReturnValue([]);
      mockParseBumpDiff.mockReturnValue([]);

      await runCallback({
        flags: { ...defaultFlags, mergeBase: 'abc123def' },
        log: mockLog,
      });

      expect(mockExecSync).not.toHaveBeenCalledWith('git remote -v', expect.any(Object));
    });
  });

  describe('remote resolution (local dev path)', () => {
    it('resolves elastic/kibana remote from git remote -v', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git remote -v') return gitRemoteOutput;
        return 'openapi: 3.0.0';
      });
      mockRunBumpDiff.mockReturnValue([]);
      mockParseBumpDiff.mockReturnValue([]);

      await runCallback({ flags: defaultFlags, log: mockLog });

      expect(mockExecSync).toHaveBeenCalledWith(
        'git show upstream/main:oas_docs/output/kibana.yaml',
        expect.any(Object)
      );
      expect(mockLog.info).toHaveBeenCalledWith('Base: upstream/main');
    });

    it('falls back to origin when elastic/kibana remote is not found', async () => {
      const noElasticRemotes = [
        'origin\tgit@github.com:myuser/kibana.git (fetch)',
        'origin\tgit@github.com:myuser/kibana.git (push)',
      ].join('\n');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git remote -v') return noElasticRemotes;
        return 'openapi: 3.0.0';
      });
      mockRunBumpDiff.mockReturnValue([]);
      mockParseBumpDiff.mockReturnValue([]);

      await runCallback({ flags: defaultFlags, log: mockLog });

      expect(mockExecSync).toHaveBeenCalledWith(
        'git show origin/main:oas_docs/output/kibana.yaml',
        expect.any(Object)
      );
    });

    it('fetches remote branch when git show fails initially', async () => {
      let showCount = 0;
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git remote -v') return gitRemoteOutput;
        if (typeof cmd === 'string' && cmd.startsWith('git show')) {
          showCount++;
          if (showCount === 1) throw new Error('not found');
          return 'openapi: 3.0.0';
        }
        if (typeof cmd === 'string' && cmd.startsWith('git fetch')) return '';
        return '';
      });
      mockRunBumpDiff.mockReturnValue([]);
      mockParseBumpDiff.mockReturnValue([]);

      await runCallback({ flags: defaultFlags, log: mockLog });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git fetch upstream main'),
        expect.any(Object)
      );
    });
  });

  it('cleans up temp files even on error', async () => {
    mockRunBumpDiff.mockImplementation(() => {
      throw new Error('bump-cli failed');
    });
    mockParseBumpDiff.mockReturnValue([]);

    await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
      'bump-cli failed'
    );

    expect(rmSync).toHaveBeenCalled();
  });

  it('logs allowlisted change count when some are allowlisted', async () => {
    const changes: BreakingChange[] = [
      { type: 'path_removed', path: '/api/spaces/space', reason: 'Endpoint removed' },
      {
        type: 'method_removed',
        path: '/api/fleet/agents',
        method: 'POST',
        reason: 'Method removed',
      },
    ];
    mockRunBumpDiff.mockReturnValue([]);
    mockParseBumpDiff.mockReturnValue(changes);
    mockCheckTerraformImpact.mockReturnValue({
      hasImpact: true,
      impactedChanges: changes.map((c) => ({ change: c, terraformResource: 'test_resource' })),
    });
    mockLoadAllowlist.mockReturnValue({ entries: [] });
    mockApplyAllowlist.mockReturnValue({
      breakingChanges: [changes[0]],
      allowlistedChanges: [changes[1]],
    });
    mockFormatFailure.mockReturnValue('FAILURE REPORT');

    await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow();

    expect(mockLog.info).toHaveBeenCalledWith('1 allowlisted change(s) ignored');
  });

  it('warns and does not fail when bump.sh service is unavailable', async () => {
    mockRunBumpDiff.mockImplementation(() => {
      throw new BumpServiceError(
        'bump.sh service unavailable — the API diff could not be computed.'
      );
    });

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('bump.sh service unavailable')
    );
    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('Skipping API contract check')
    );
  });

  it('still cleans up temp files when bump.sh service is unavailable', async () => {
    mockRunBumpDiff.mockImplementation(() => {
      throw new BumpServiceError('bump.sh service unavailable');
    });

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(rmSync).toHaveBeenCalled();
  });
});
