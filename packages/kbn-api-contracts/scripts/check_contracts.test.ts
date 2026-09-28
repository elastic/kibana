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

jest.mock('../src/diff/run_oasdiff', () => ({
  runOasdiff: jest.fn(),
}));

jest.mock('../src/diff/run_oasdiff_structural', () => ({
  runOasdiffStructural: jest.fn(),
}));

jest.mock('../src/diff/parse_oasdiff', () => ({
  parseOasdiff: jest.fn(),
}));

jest.mock('../src/input/load_oas', () => ({
  loadOas: jest.fn().mockResolvedValue({
    openapi: '3.0.0',
    info: { title: 't', version: '1' },
    paths: {},
    components: { schemas: {} },
  }),
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
import { writeFileSync, rmSync } from 'fs';
import { runOasdiff, runOasdiffStructural, parseOasdiff, applyAllowlist } from '../src/diff';
import type { BreakingChange } from '../src/diff';
import { loadOas } from '../src/input/load_oas';
import { loadAllowlist } from '../src/allowlist/load_allowlist';
import { formatFailure } from '../src/report/format_failure';

const mockRun = jest.requireMock('@kbn/dev-cli-runner').run as jest.Mock;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockRunOasdiff = runOasdiff as jest.MockedFunction<typeof runOasdiff>;
const mockRunOasdiffStructural = runOasdiffStructural as jest.MockedFunction<
  typeof runOasdiffStructural
>;
const mockParseOasdiff = parseOasdiff as jest.MockedFunction<typeof parseOasdiff>;
const mockLoadOas = loadOas as jest.MockedFunction<typeof loadOas>;
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
    mockLoadOas.mockResolvedValue({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: { schemas: {} },
    });
    // Whole-surface defaults: allowlist passes everything through and
    // formatFailure is a stub. Individual tests override as needed.
    mockLoadAllowlist.mockReturnValue({ entries: [] });
    mockApplyAllowlist.mockImplementation((changes) => ({
      breakingChanges: changes,
      allowlistedChanges: [],
    }));
    mockFormatFailure.mockReturnValue('FAILURE REPORT');
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
    expect(mockRunOasdiff).not.toHaveBeenCalled();
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
    expect(mockRunOasdiff).not.toHaveBeenCalled();
  });

  it('warns and skips when oasdiff fails due to example $ref parsing', async () => {
    mockRunOasdiff.mockImplementation(() => {
      throw new Error('bad data in "#/components/schemas/Foo" (expecting ref to example object)');
    });

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining('oasdiff cannot parse the base spec')
    );
  });

  it('still throws on non-example oasdiff errors', async () => {
    mockRunOasdiff.mockImplementation(() => {
      throw new Error('some other oasdiff failure');
    });

    await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
      'some other oasdiff failure'
    );
  });

  it('reports success when no breaking changes', async () => {
    mockRunOasdiff.mockReturnValue([]);
    mockParseOasdiff.mockReturnValue([]);

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockLog.success).toHaveBeenCalledWith('No breaking changes detected');
  });

  it('always diffs the whole surface (never scopes oasdiff to a matchPath)', async () => {
    mockRunOasdiff.mockReturnValue([]);
    mockParseOasdiff.mockReturnValue([]);

    await runCallback({ flags: defaultFlags, log: mockLog });

    expect(mockRunOasdiff).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    expect(mockRunOasdiffStructural).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });

  it('uses default specPath based on distribution', async () => {
    mockRunOasdiff.mockReturnValue([]);
    mockParseOasdiff.mockReturnValue([]);

    await runCallback({
      flags: { distribution: 'serverless', baseBranch: 'main' },
      log: mockLog,
    });

    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('kibana.serverless.yaml'));
  });

  describe('merge base (CI path)', () => {
    it('uses git show with merge base SHA when --mergeBase is provided', async () => {
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

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
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

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
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

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
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

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
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

      await runCallback({ flags: defaultFlags, log: mockLog });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git fetch upstream main'),
        expect.any(Object)
      );
    });
  });

  it('cleans up temp files even on error', async () => {
    mockRunOasdiff.mockImplementation(() => {
      throw new Error('oasdiff failed');
    });
    mockParseOasdiff.mockReturnValue([]);

    await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
      'oasdiff failed'
    );

    expect(rmSync).toHaveBeenCalled();
  });

  describe('temp filename includes distribution', () => {
    it('includes distribution in temp filename for remote path', async () => {
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

      await runCallback({ flags: defaultFlags, log: mockLog });

      const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writtenPath).toMatch(/base-stack-\d+\.yaml$/);
    });

    it('includes distribution in temp filename for merge base path', async () => {
      mockRunOasdiff.mockReturnValue([]);
      mockParseOasdiff.mockReturnValue([]);

      await runCallback({
        flags: { ...defaultFlags, distribution: 'serverless', mergeBase: 'abc123' },
        log: mockLog,
      });

      const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writtenPath).toMatch(/base-serverless-\d+\.yaml$/);
    });
  });

  describe('allowlist suppression (whole surface)', () => {
    const stableChange: BreakingChange = {
      type: 'path_removed',
      path: '/api/spaces/space',
      reason: 'Endpoint removed',
    };
    const anotherChange: BreakingChange = {
      type: 'method_removed',
      path: '/api/fleet/agents',
      method: 'POST',
      reason: 'Method removed',
    };

    beforeEach(() => {
      mockRunOasdiff.mockReturnValue([]);
    });

    it('applies the allowlist to every parsed change', async () => {
      mockParseOasdiff.mockReturnValue([stableChange, anotherChange]);
      mockApplyAllowlist.mockReturnValue({
        breakingChanges: [stableChange, anotherChange],
        allowlistedChanges: [],
      });

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow();

      expect(mockApplyAllowlist).toHaveBeenCalledWith([stableChange, anotherChange], {
        entries: [],
      });
    });

    it('reports success when every breaking change is allowlisted', async () => {
      mockParseOasdiff.mockReturnValue([stableChange]);
      mockApplyAllowlist.mockReturnValue({
        breakingChanges: [],
        allowlistedChanges: [stableChange],
      });

      await runCallback({ flags: defaultFlags, log: mockLog });

      expect(mockLog.success).toHaveBeenCalledWith('All breaking changes are allowlisted');
    });

    it('logs the count of allowlisted changes that are ignored', async () => {
      mockParseOasdiff.mockReturnValue([stableChange, anotherChange]);
      mockApplyAllowlist.mockReturnValue({
        breakingChanges: [stableChange],
        allowlistedChanges: [anotherChange],
      });

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow();

      expect(mockLog.info).toHaveBeenCalledWith('1 allowlisted change(s) ignored');
    });
  });

  describe('tier classification (whole surface)', () => {
    const stableChange: BreakingChange = {
      type: 'method_removed',
      path: '/api/x',
      method: 'POST',
      reason: 'stable break',
    };
    const techPreviewChange: BreakingChange = {
      type: 'method_removed',
      path: '/api/tp',
      method: 'POST',
      reason: 'tech_preview break',
    };
    const experimentalChange: BreakingChange = {
      type: 'method_removed',
      path: '/api/exp',
      method: 'POST',
      reason: 'experimental break',
    };

    const baseSpec = (paths: Record<string, unknown>) => ({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths,
      components: { schemas: {} },
    });

    const currentSpec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: { schemas: {} },
    };

    // check_contracts loads the current spec first, then the base spec; the base
    // is where resolveTier reads x-state from.
    const primeLoadOas = (base: ReturnType<typeof baseSpec>) => {
      mockLoadOas.mockResolvedValueOnce(currentSpec).mockResolvedValueOnce(base);
    };

    beforeEach(() => {
      mockRunOasdiff.mockReturnValue([]);
      mockRunOasdiffStructural.mockReturnValue(undefined);
    });

    it('catches a stable breaking change and throws', async () => {
      mockParseOasdiff.mockReturnValue([stableChange]);
      primeLoadOas(baseSpec({ '/api/x': { post: { 'x-state': 'Generally available' } } }));

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
        'Detected 1 breaking change(s) in stable/tech_preview APIs: 1 stable, 0 tech_preview'
      );
      expect(mockLog.error).toHaveBeenCalledWith('FAILURE REPORT');
    });

    it('catches a tech_preview breaking change and throws', async () => {
      mockParseOasdiff.mockReturnValue([techPreviewChange]);
      primeLoadOas(baseSpec({ '/api/tp': { post: { 'x-state': 'Technical Preview' } } }));

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
        '0 stable, 1 tech_preview'
      );
    });

    it('defaults an unmarked API to stable and catches it', async () => {
      mockParseOasdiff.mockReturnValue([stableChange]);
      primeLoadOas(baseSpec({ '/api/x': { post: {} } }));

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
        '1 stable, 0 tech_preview'
      );
    });

    it('reports an experimental breaking change but does not gate on it', async () => {
      mockParseOasdiff.mockReturnValue([experimentalChange]);
      primeLoadOas(baseSpec({ '/api/exp': { post: { 'x-state': 'Experimental' } } }));

      await runCallback({
        flags: { ...defaultFlags, reportPath: 'target/reports/stack-impact.json' },
        log: mockLog,
      });

      expect(mockLog.info).toHaveBeenCalledWith(
        '1 experimental-tier breaking change(s) reported (informational, not blocking)'
      );
      expect(mockLog.success).toHaveBeenCalledWith(
        'No breaking changes detected in stable or tech_preview APIs'
      );

      // The experimental change is still written to the report so the PR notifier
      // can surface it as informational; it just does not fail the check.
      const reportCall = mockWriteFileSync.mock.calls.find(([path]) =>
        String(path).endsWith('stack-impact.json')
      );
      expect(reportCall).toBeDefined();
      expect(JSON.parse(reportCall![1] as string)).toEqual({
        entries: [
          {
            path: '/api/exp',
            method: 'POST',
            reason: 'experimental break',
            tier: 'experimental',
          },
        ],
      });
    });

    it('gates on stable and tech_preview while reporting experimental in a mixed run', async () => {
      mockParseOasdiff.mockReturnValue([stableChange, techPreviewChange, experimentalChange]);
      primeLoadOas(
        baseSpec({
          '/api/x': { post: { 'x-state': 'Generally available' } },
          '/api/tp': { post: { 'x-state': 'Technical Preview' } },
          '/api/exp': { post: { 'x-state': 'Experimental' } },
        })
      );

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
        'Detected 2 breaking change(s) in stable/tech_preview APIs: 1 stable, 1 tech_preview'
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        '1 experimental-tier breaking change(s) reported (informational, not blocking)'
      );
    });

    it('writes a tier-classified report when reportPath is set', async () => {
      mockParseOasdiff.mockReturnValue([stableChange]);
      primeLoadOas(baseSpec({ '/api/x': { post: { 'x-state': 'Generally available' } } }));

      await expect(
        runCallback({
          flags: { ...defaultFlags, reportPath: 'target/reports/stack-impact.json' },
          log: mockLog,
        })
      ).rejects.toThrow();

      const reportCall = mockWriteFileSync.mock.calls.find(([path]) =>
        String(path).endsWith('stack-impact.json')
      );
      expect(reportCall).toBeDefined();
      expect(JSON.parse(reportCall![1] as string)).toEqual({
        entries: [
          {
            path: '/api/x',
            method: 'POST',
            reason: 'stable break',
            tier: 'stable',
          },
        ],
      });
    });
  });

  describe('additionalProperties tightening (E2E reverse-index path)', () => {
    const realParseOasdiff = jest.requireActual('../src/diff/parse_oasdiff')
      .parseOasdiff as typeof parseOasdiff;

    it('surfaces a synthetic component-level entry exactly once for the consumer endpoint', async () => {
      const consumerPath = '/api/data_views/data_view';
      const componentName = 'Data_views_create_data_view_request_object';

      mockLoadOas.mockResolvedValue({
        openapi: '3.0.0',
        info: { title: 't', version: '1' },
        paths: {
          [consumerPath]: {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${componentName}` },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            [componentName]: { type: 'object' },
          },
        },
      });

      mockRunOasdiff.mockReturnValue([]);
      mockRunOasdiffStructural.mockReturnValue({
        components: {
          schemas: {
            modified: {
              [componentName]: {
                additionalPropertiesAllowed: { from: null, to: false },
              },
            },
          },
        },
      });

      // Use the real parseOasdiff so the synthetic entry flows through the
      // same parse pipeline as oasdiff entries; pass-through applyAllowlist so
      // nothing is filtered out.
      mockParseOasdiff.mockImplementation(realParseOasdiff);
      mockApplyAllowlist.mockImplementation((changes) => ({
        breakingChanges: changes,
        allowlistedChanges: [],
      }));

      await expect(runCallback({ flags: defaultFlags, log: mockLog })).rejects.toThrow(
        'Detected 1 breaking change(s) in stable/tech_preview APIs: 1 stable, 0 tech_preview'
      );

      expect(mockFormatFailure).toHaveBeenCalledTimes(1);
      const entries = mockFormatFailure.mock.calls[0][0];
      expect(entries).toEqual([
        {
          path: consumerPath,
          method: 'POST',
          reason:
            'Request body schema disallows extra fields (additionalProperties: false). Clients sending unknown keys will now receive 400.',
          oasdiffId: 'kbn:request-additional-properties-tightened',
          source: `/components/schemas/${componentName}`,
          tier: 'stable',
        },
      ]);
    });
  });
});
