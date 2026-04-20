/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  getAllPackages,
  shouldScanFile,
  discoverFilesViaGitGrep,
  formatRuleHeader,
  diffTeamSets,
  generateRenovateCodeowners,
} from './generate_renovate_codeowners';
import type {
  GenerateRenovateCodeownersDeps,
  GenerateRenovateCodeownersLog,
  GenerateRenovateCodeownersOptions,
} from './generate_renovate_codeowners';
import type { WorkerPoolLike, WorkerBatchItem, WorkerBatchItemResult } from './worker_pool';

interface RenovateConfigFixture {
  packageRules?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

interface WorkerResultFixture {
  imports?: string[];
  teams?: string[];
  skipped?: boolean;
}

class FakeWorkerPool implements WorkerPoolLike {
  shutdownCalls = 0;
  processed: string[] = [];
  /** When set, every processBatch call rejects the whole batch with this error. */
  rejectAllWith: Error | null = null;
  /**
   * Optional per-file error: that file is reported as `success: false` inside
   * the batch result (mirroring how the real worker surfaces per-file failures).
   * Other files in the same batch still resolve normally.
   */
  rejectForFiles = new Map<string, Error>();
  /** Per-file canned response. Unset paths default to `{ skipped: true }`. */
  results = new Map<string, WorkerResultFixture>();

  async processBatch(items: WorkerBatchItem[]): Promise<WorkerBatchItemResult[]> {
    for (const item of items) {
      this.processed.push(item.relativePath);
    }
    if (this.rejectAllWith) {
      throw this.rejectAllWith;
    }
    return items.map((item): WorkerBatchItemResult => {
      const perFileError = this.rejectForFiles.get(item.relativePath);
      if (perFileError) {
        return {
          relativePath: item.relativePath,
          success: false,
          error: perFileError.message,
        };
      }
      const r = this.results.get(item.relativePath) ?? { skipped: true };
      return {
        relativePath: item.relativePath,
        success: true,
        imports: r.imports ?? [],
        teams: r.teams ?? [],
        skipped: r.skipped,
      };
    });
  }

  async shutdown(): Promise<void> {
    this.shutdownCalls++;
  }
}

interface SetupArgs {
  packageJson: Record<string, unknown>;
  renovateConfig: RenovateConfigFixture;
  codeOwners?: string;
}

interface SetupResult {
  repoRoot: string;
  readRenovateConfig: () => RenovateConfigFixture;
  cleanup: () => void;
}

const setupRepo = ({ packageJson, renovateConfig, codeOwners = '' }: SetupArgs): SetupResult => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'krrs-'));
  mkdirSync(join(repoRoot, '.github'), { recursive: true });
  writeFileSync(join(repoRoot, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');
  writeFileSync(join(repoRoot, 'renovate.json'), JSON.stringify(renovateConfig, null, 2), 'utf8');
  writeFileSync(join(repoRoot, '.github/CODEOWNERS'), codeOwners, 'utf8');

  return {
    repoRoot,
    readRenovateConfig: () =>
      JSON.parse(readFileSync(join(repoRoot, 'renovate.json'), 'utf8')) as RenovateConfigFixture,
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
};

const buildLog = (): GenerateRenovateCodeownersLog & {
  infoLines: string[];
  successLines: string[];
  rawWrites: string[];
} => {
  const infoLines: string[] = [];
  const successLines: string[] = [];
  const rawWrites: string[] = [];
  return {
    infoLines,
    successLines,
    rawWrites,
    info: (...args: any[]) => {
      infoLines.push(args.join(' '));
    },
    success: (...args: any[]) => {
      successLines.push(args.join(' '));
    },
    write: (...args: any[]) => {
      rawWrites.push(args.join(''));
    },
  };
};

interface RunArgs {
  setup: SetupResult;
  options: GenerateRenovateCodeownersOptions;
  files: string[];
  pool: FakeWorkerPool;
  workerCount?: number;
  exitCodes?: number[];
  extraDeps?: Partial<GenerateRenovateCodeownersDeps>;
}

interface RunResult {
  log: ReturnType<typeof buildLog>;
  exitCodes: number[];
  pool: FakeWorkerPool;
}

const runOrchestrator = async ({
  setup,
  options,
  files,
  pool,
  workerCount = 2,
  exitCodes = [],
  extraDeps,
}: RunArgs): Promise<RunResult> => {
  const log = buildLog();
  await generateRenovateCodeowners(log, options, {
    repoRoot: setup.repoRoot,
    discoverFiles: () => files,
    createWorkerPool: () => pool,
    workerCount,
    setExitCode: (code) => exitCodes.push(code),
    installSignalHandlers: false,
    ...extraDeps,
  });
  return { log, exitCodes, pool };
};

describe('getAllPackages', () => {
  it('SHOULD return [] when no dep buckets are present', () => {
    expect(getAllPackages({})).toEqual([]);
  });

  it('SHOULD include dependencies', () => {
    expect(getAllPackages({ dependencies: { lodash: '1', react: '2' } })).toEqual([
      'lodash',
      'react',
    ]);
  });

  it('SHOULD include devDependencies', () => {
    expect(getAllPackages({ devDependencies: { jest: '1' } })).toEqual(['jest']);
  });

  it('SHOULD include peerDependencies', () => {
    expect(getAllPackages({ peerDependencies: { react: '1' } })).toEqual(['react']);
  });

  it('SHOULD union deps + devDeps + peerDeps', () => {
    expect(
      getAllPackages({
        dependencies: { a: '1' },
        devDependencies: { b: '1' },
        peerDependencies: { c: '1' },
      })
    ).toEqual(['a', 'b', 'c']);
  });

  it('SHOULD exclude @kbn/* internal packages', () => {
    expect(
      getAllPackages({
        dependencies: { '@kbn/foo': '1', '@kbn/bar': '2', lodash: '3' },
      })
    ).toEqual(['lodash']);
  });

  it('SHOULD dedupe a package that appears in multiple buckets', () => {
    expect(
      getAllPackages({
        dependencies: { lodash: '1' },
        devDependencies: { lodash: '1' },
      })
    ).toEqual(['lodash']);
  });

  it('SHOULD return packages sorted lexicographically', () => {
    expect(getAllPackages({ dependencies: { zeta: '1', alpha: '1', mu: '1' } })).toEqual([
      'alpha',
      'mu',
      'zeta',
    ]);
  });

  it('SHOULD tolerate non-object input gracefully', () => {
    expect(getAllPackages(null)).toEqual([]);
    expect(getAllPackages(undefined)).toEqual([]);
  });
});

describe('shouldScanFile', () => {
  it.each([
    ['src/foo.ts', true],
    ['src/foo.tsx', true],
    ['src/foo.js', true],
    ['src/foo.jsx', true],
    ['x-pack/foo.ts', true],
    ['packages/foo.ts', true],
    ['packages/deep/nested/foo.ts', true],
    ['tools/foo.ts', false],
    ['src/foo.md', false],
    ['src/foo.json', false],
    ['src/foo', false],
    ['', false],
  ])('SHOULD return %p for %p', (input, expected) => {
    expect(shouldScanFile(input)).toEqual(expected);
  });
});

describe('formatRuleHeader', () => {
  it('SHOULD render just the quoted groupName when present, dropping the array index', () => {
    expect(formatRuleHeader({ index: 72, groupName: 'babel' })).toEqual('"babel"');
  });

  it('SHOULD fall back to rule[N] when groupName is missing so the rule stays locatable', () => {
    expect(formatRuleHeader({ index: 12 })).toEqual('rule[12]');
  });

  it('SHOULD preserve groupNames that contain spaces and special characters', () => {
    expect(
      formatRuleHeader({ index: 128, groupName: 'mapbox-gl-rtl-text (pinned until X)' })
    ).toEqual('"mapbox-gl-rtl-text (pinned until X)"');
  });
});

describe('diffTeamSets', () => {
  it('SHOULD report teams added (in after but not in before)', () => {
    expect(diffTeamSets(['team:a'], ['team:a', 'team:b', 'team:c'])).toEqual({
      added: ['team:b', 'team:c'],
      removed: [],
      kept: ['team:a'],
    });
  });

  it('SHOULD report teams removed (in before but not in after)', () => {
    expect(diffTeamSets(['team:a', 'team:b'], ['team:a'])).toEqual({
      added: [],
      removed: ['team:b'],
      kept: ['team:a'],
    });
  });

  it('SHOULD report added, removed, and kept teams together', () => {
    expect(diffTeamSets(['team:a', 'team:b'], ['team:b', 'team:c'])).toEqual({
      added: ['team:c'],
      removed: ['team:a'],
      kept: ['team:b'],
    });
  });

  it('SHOULD return all-kept when sets are identical', () => {
    expect(diffTeamSets(['team:a', 'team:b'], ['team:a', 'team:b'])).toEqual({
      added: [],
      removed: [],
      kept: ['team:a', 'team:b'],
    });
  });

  it('SHOULD treat empty before as all-added with empty kept', () => {
    expect(diffTeamSets([], ['team:a', 'team:b'])).toEqual({
      added: ['team:a', 'team:b'],
      removed: [],
      kept: [],
    });
  });

  it('SHOULD satisfy before.length === kept.length + removed.length and after.length === kept.length + added.length', () => {
    const before = ['team:a', 'team:b', 'team:c'];
    const after = ['team:b', 'team:c', 'team:d', 'team:e'];
    const { added, removed, kept } = diffTeamSets(before, after);
    expect(kept.length + removed.length).toEqual(before.length);
    expect(kept.length + added.length).toEqual(after.length);
  });
});

describe('discoverFilesViaGitGrep', () => {
  let repoRoot: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'krrs-grep-'));
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repoRoot });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
    execFileSync('git', ['config', 'user.name', 'test'], { cwd: repoRoot });
    mkdirSync(join(repoRoot, 'src'), { recursive: true });
    mkdirSync(join(repoRoot, 'x-pack'), { recursive: true });
    mkdirSync(join(repoRoot, 'packages'), { recursive: true });
    mkdirSync(join(repoRoot, 'tools'), { recursive: true });

    writeFileSync(join(repoRoot, 'src/with_import.ts'), "import x from 'lodash';\n", 'utf8');
    writeFileSync(join(repoRoot, 'src/with_require.js'), "const x = require('lodash');\n", 'utf8');
    writeFileSync(
      join(repoRoot, 'x-pack/with_export.ts'),
      "export { foo } from 'lodash';\n",
      'utf8'
    );
    writeFileSync(join(repoRoot, 'packages/no_imports.ts'), 'export const x = 1;\n', 'utf8');
    writeFileSync(join(repoRoot, 'tools/wrong_prefix.ts'), "import x from 'lodash';\n", 'utf8');
    writeFileSync(join(repoRoot, 'src/wrong_ext.md'), "import x from 'lodash';\n", 'utf8');

    execFileSync('git', ['add', '-A'], { cwd: repoRoot });
    execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: repoRoot });
  });

  afterAll(() => {
    if (repoRoot) rmSync(repoRoot, { recursive: true, force: true });
  });

  it('SHOULD discover files containing import/require/export under scanned prefixes', () => {
    const files = discoverFilesViaGitGrep(repoRoot).sort();
    expect(files).toEqual(['src/with_import.ts', 'src/with_require.js', 'x-pack/with_export.ts']);
  });
});

describe('generateRenovateCodeowners', () => {
  let setup: SetupResult | null = null;

  afterEach(() => {
    if (setup) {
      setup.cleanup();
      setup = null;
    }
  });

  describe('WHEN running in dry-run mode', () => {
    it('SHOULD NOT modify renovate.json even if managed rules drift', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([]);
      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:old']);
      expect(pool.shutdownCalls).toEqual(1);
    });
  });

  describe('WHEN running in write mode', () => {
    it('SHOULD update renovate.json for managed sync rules with drift', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([]);
      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:team-new']);
    });

    it('SHOULD NOT touch managed=fixed rules even when usage differs', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:fixed-owner'],
              x_kbn_reviewer_sync: { mode: 'fixed' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-other'] });

      await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts'],
        pool,
      });

      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:fixed-owner']);
    });

    it('SHOULD NOT touch report-only rules (no x_kbn_reviewer_sync) even when drift exists', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:original'],
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([]);
      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:original']);
    });
  });

  describe('WHEN running in check mode', () => {
    it('SHOULD set exit code 1 when a managed sync rule needs updating', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'check' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([1]);
      // check mode never writes.
      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:old']);
    });

    it('SHOULD NOT set exit code when only report-only rules drift', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'check' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([]);
    });

    it('SHOULD NOT set exit code when no drift exists', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:in-sync'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/in-sync'] });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'check' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([]);
    });
  });

  describe('WHEN reportJsonPath is set', () => {
    it('SHOULD write the report to the supplied path', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const reportPath = join(setup.repoRoot, 'report.json');
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      await runOrchestrator({
        setup,
        options: { mode: 'dry-run', reportJsonPath: reportPath },
        files: ['src/a.ts'],
        pool,
      });

      expect(existsSync(reportPath)).toEqual(true);
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      // dry-run: `updatedRules` stays 0 (we only counted what WOULD change);
      // `managedSyncNeeded` is the would-be count.
      expect(report).toMatchObject({
        rulesSyncManaged: 1,
        managedSyncNeeded: 1,
        updatedRules: 0,
      });
    });
  });

  describe('WHEN a worker fails to process a file', () => {
    it('SHOULD throw and refuse to write renovate.json', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.rejectForFiles.set('src/b.ts', new Error('worker exploded'));
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-new'] });

      const log = buildLog();
      await expect(
        generateRenovateCodeowners(
          log,
          { mode: 'write' },
          {
            repoRoot: setup.repoRoot,
            discoverFiles: () => ['src/a.ts', 'src/b.ts'],
            createWorkerPool: () => pool,
            workerCount: 2,
            setExitCode: () => {},
            installSignalHandlers: false,
          }
        )
      ).rejects.toThrow(/Aborting reviewer sync: failed to process src\/b\.ts/);

      // The original config must be untouched — no partial write.
      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:old']);
      expect(pool.shutdownCalls).toEqual(1);
    });
  });

  describe('WHEN aggregating results across multiple files', () => {
    it('SHOULD union teams from every file that imports a package', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:will-be-replaced'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-a'] });
      pool.results.set('src/b.ts', { imports: ['lodash'], teams: ['@elastic/team-b'] });
      pool.results.set('src/c.ts', { imports: ['lodash'], teams: ['@elastic/team-a'] });

      await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
        pool,
      });

      const reviewers = setup.readRenovateConfig().packageRules?.[0].reviewers as string[];
      expect(reviewers.sort()).toEqual(['team:team-a', 'team:team-b']);
    });

    it('SHOULD prefix bare team names with `@` before deduping', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:original'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      // worker.js may emit team names with or without the leading `@`.
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['elastic/team-z'] });
      pool.results.set('src/b.ts', { imports: ['lodash'], teams: ['@elastic/team-z'] });

      await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts', 'src/b.ts'],
        pool,
      });

      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:team-z']);
    });

    it('SHOULD ignore worker results for packages NOT in package.json', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      // 'unknown-pkg' is not in package.json — it must be ignored entirely.
      pool.results.set('src/a.ts', {
        imports: ['unknown-pkg', 'lodash'],
        teams: ['@elastic/team-x'],
      });

      await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts'],
        pool,
      });

      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:team-x']);
    });

    it('SHOULD skip files the worker marks `skipped: true`', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', {
        imports: ['lodash'],
        teams: ['@elastic/team-z'],
        skipped: true,
      });

      const { exitCodes } = await runOrchestrator({
        setup,
        options: { mode: 'write' },
        files: ['src/a.ts'],
        pool,
      });

      expect(exitCodes).toEqual([]);
      // skipped → no aggregation → managed rule has no computed reviewers → unchanged.
      expect(setup.readRenovateConfig().packageRules?.[0].reviewers).toEqual(['team:old']);
    });
  });

  describe('WHEN discoverFiles returns paths outside scanned prefixes/extensions', () => {
    it('SHOULD filter them out via shouldScanFile before dispatching to workers', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
              x_kbn_reviewer_sync: { mode: 'sync' },
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/team-a'] });

      await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: [
          'src/a.ts', // kept
          'tools/b.ts', // wrong prefix
          'src/c.md', // wrong extension
          '', // empty
        ],
        pool,
      });

      expect(pool.processed.sort()).toEqual(['src/a.ts']);
    });
  });

  describe('WHEN all files are processed cleanly', () => {
    it('SHOULD shutdown the worker pool exactly once', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: { packageRules: [] },
      });
      const pool = new FakeWorkerPool();
      await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts', 'src/b.ts'],
        pool,
      });
      expect(pool.shutdownCalls).toEqual(1);
    });
  });

  describe('WHEN printing the reviewer-sync report', () => {
    it('SHOULD label rules with quoted groupName and show full added/removed team diffs for report-only drift', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1', react: '1' } },
        renovateConfig: {
          packageRules: [
            {
              groupName: 'webpack',
              matchDepNames: ['lodash'],
              reviewers: ['team:old-owner'],
            },
            {
              groupName: 'react testing',
              matchDepNames: ['react'],
              reviewers: ['team:keeps-this'],
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', {
        imports: ['lodash'],
        teams: ['@elastic/kibana-core', '@elastic/kibana-presentation'],
      });
      pool.results.set('src/b.ts', {
        imports: ['react'],
        teams: ['@elastic/keeps-this', '@elastic/kibana-ui'],
      });

      const { log } = await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts', 'src/b.ts'],
        pool,
      });

      const combined = log.infoLines.join('\n');
      // Header uses the total count, not `first N`, now that we don't truncate.
      expect(combined).toContain('🔧 Reviewer drift detected for report-only rules (2 rules):');
      // Rule 0: old-owner fully replaced → +2 adds, -1 remove, 0 kept, all lists shown.
      // Rule 0 header uses the groupName as identifier (no array index); the
      // colored `+`/`-` lines below carry the added/removed detail, so the
      // header omits the redundant `(+A -R =K)` arithmetic.
      expect(combined).toContain('   🔸 "webpack" (1 pkgs): 1 -> 2 teams');
      expect(combined).toContain('       + team:kibana-core, team:kibana-presentation');
      expect(combined).toContain('       - team:old-owner');
      // Rule 1: unchanged line uses a 2-space prefix (no marker) so content
      // stays in the same column as `+ ` / `- ` lines (classic unified-diff
      // alignment).
      expect(combined).toContain('   🔸 "react testing" (1 pkgs): 1 -> 2 teams');
      expect(combined).toContain('       + team:kibana-ui');
      expect(combined).toContain('         team:keeps-this');
      // Rule 1 has no removals, so no `- team:` line appears under it.
      expect(combined).not.toMatch(/"react testing"[\s\S]*?\n\s+- team:/);
    });

    it('SHOULD label rules with quoted groupName in the no-computed-reviewers section', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              groupName: 'unused-pkg-group',
              matchDepNames: ['lodash'],
              reviewers: ['team:kept'],
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      // No imports emitted → package has no teams → no computed reviewers.
      pool.results.set('src/a.ts', { imports: [], teams: [] });

      const { log } = await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts'],
        pool,
      });

      const combined = log.infoLines.join('\n');
      expect(combined).toContain(
        '⚠️  Rules where reviewers could not be computed from usage/CODEOWNERS (1):'
      );
      expect(combined).toContain('   ❓ "unused-pkg-group" (report) (1 pkgs): lodash');
    });

    it('SHOULD prefix uncovered-package lines with 📦', async () => {
      setup = setupRepo({
        // lodash is in deps but no rule covers it → uncovered.
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: { packageRules: [] },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/kibana-core'] });

      const { log } = await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts'],
        pool,
      });

      const combined = log.infoLines.join('\n');
      expect(combined).toContain(
        '⚠️  Packages used in code but not covered by explicit package rules (1):'
      );
      expect(combined).toContain('   📦 lodash');
    });

    it('SHOULD reconcile the teams math: after.length == kept.length + added.length (user-reported bug: "1 -> 2 teams but outputs 1 team")', async () => {
      // Reproduces the exact shape of the reported bug: one kept team + one
      // added team. The header advertises `1 -> 2 teams`, so *two* teams must
      // appear under it — one as a `+ team:` (added, green) line and one as a
      // dim, 2-space-prefixed context line (unchanged) — otherwise the
      // before/after counts don't reconcile.
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              groupName: 'react-day-picker',
              matchDepNames: ['lodash'],
              reviewers: ['team:appex-sharedux'],
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', {
        imports: ['lodash'],
        // Emits BOTH the previously-existing reviewer and a new team; the
        // existing one must be reported as "kept", not silently dropped from
        // the displayed totals.
        teams: ['@elastic/appex-sharedux', '@elastic/kibana-core'],
      });

      const { log } = await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts'],
        pool,
      });

      const combined = log.infoLines.join('\n');
      expect(combined).toContain('   🔸 "react-day-picker" (1 pkgs): 1 -> 2 teams');
      expect(combined).toContain('       + team:kibana-core');
      expect(combined).toContain('         team:appex-sharedux');
    });

    it('SHOULD fall back to plain `rule[N]` when a drift rule has no groupName', async () => {
      setup = setupRepo({
        packageJson: { dependencies: { lodash: '1' } },
        renovateConfig: {
          packageRules: [
            {
              matchDepNames: ['lodash'],
              reviewers: ['team:old'],
            },
          ],
        },
      });
      const pool = new FakeWorkerPool();
      pool.results.set('src/a.ts', { imports: ['lodash'], teams: ['@elastic/kibana-core'] });

      const { log } = await runOrchestrator({
        setup,
        options: { mode: 'dry-run' },
        files: ['src/a.ts'],
        pool,
      });

      const combined = log.infoLines.join('\n');
      expect(combined).toContain('   🔸 rule[0] (1 pkgs): 1 -> 1 teams');
      expect(combined).not.toContain('rule[0] "');
    });
  });
});
