/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const HOOK = resolve(__dirname, 'skipped_on_main.sh');
const TARGET_SHA = 'abcdef1234567890abcdef1234567890abcdef12';

const knownSkippedEvaluation = JSON.stringify({
  knownSkipped: [
    {
      failure: { kind: 'ftr', file: 'x-pack/test/a.ts', fullTitle: 'suite a test a' },
      issue: 'https://github.com/elastic/kibana/issues/1',
    },
    { failure: { kind: 'scout', file: 'b.spec.ts', suite: 'suite b', title: 'test b' } },
  ],
  real: [],
});

/**
 * A fake repository checkout with stubbed `node`, `git` and `buildkite-agent` on PATH. Each stub
 * records its invocations so the test can assert what the hook passed on.
 */
class Sandbox {
  readonly root = mkdtempSync(join(tmpdir(), 'skipped-on-main-'));
  private readonly bin = join(this.root, 'bin');
  /** Marker created "before the run"; reports must be newer than it to be evaluated. */
  readonly marker = join(this.root, 'marker');

  constructor() {
    mkdirSync(this.bin);
    writeFileSync(this.marker, '');
    // 1 minute in the past so freshly written reports are unambiguously newer.
    const past = (Date.now() - 60_000) / 1000;
    utimesSync(this.marker, past, past);
    this.stubNode({ stdout: knownSkippedEvaluation, exitCode: 0 });
    this.stubGit({ fetchExitCode: 0 });
    this.stubBuildkiteAgent({ exitCode: 0 });
  }

  /** `node scripts/check_skipped_on_main …` writes `stdout` and exits with `exitCode`. */
  stubNode({ stdout, exitCode }: { stdout: string; exitCode: number }) {
    writeFileSync(join(this.root, 'node.stdout'), stdout);
    this.stub(
      'node',
      `printf '%s\\n' "$@" > "$SANDBOX/node.args"; cat "$SANDBOX/node.stdout"; exit ${exitCode}`
    );
  }

  stubGit({ fetchExitCode }: { fetchExitCode: number }) {
    this.stub(
      'git',
      [
        `printf '%s\\n' "$@" >> "$SANDBOX/git.args"`,
        `case "$1" in`,
        `  fetch) exit ${fetchExitCode} ;;`,
        `  rev-parse) echo ${TARGET_SHA} ;;`,
        `esac`,
      ].join('\n')
    );
  }

  stubBuildkiteAgent({ exitCode }: { exitCode: number }) {
    this.stub(
      'buildkite-agent',
      `printf '%s\\n' "$@" > "$SANDBOX/agent.args"; cat > "$SANDBOX/agent.stdin"; exit ${exitCode}`
    );
  }

  /** Writes a report file (newer than the marker) at `relativePath`, as the hook will see it. */
  writeReport(relativePath: string, content = '<testsuites/>') {
    const path = join(this.root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return relativePath;
  }

  /** Writes a report that predates the marker, as left over from an earlier run. */
  writeStaleReport(relativePath: string) {
    const path = join(this.root, this.writeReport(relativePath));
    const stale = (Date.now() - 120_000) / 1000;
    utimesSync(path, stale, stale);
    return relativePath;
  }

  /** Sources the hook and runs `command` in the sandbox; returns its exit code and output. */
  run(command: string, env: Record<string, string | undefined> = {}) {
    const { PATH, HOME, TMPDIR } = process.env;
    // PATH is set inside the script, after any shell startup file has run, so the stubs win.
    const script = `export PATH="$SANDBOX/bin:$PATH"\nsource "${HOOK}"\n${command}`;
    const proc = spawnSync('bash', ['-c', script], {
      cwd: this.root,
      env: {
        PATH,
        HOME,
        TMPDIR,
        SANDBOX: this.root,
        GITHUB_PR_TARGET_BRANCH: 'main',
        GITHUB_PR_MERGE_BASE: '1111111111111111111111111111111111111111',
        BUILDKITE_JOB_ID: 'job-1',
        ...env,
      },
      encoding: 'utf8',
    });
    return { status: proc.status, output: proc.stdout + proc.stderr };
  }

  calls(stub: 'node' | 'git' | 'agent'): string[] | undefined {
    try {
      return readFileSync(join(this.root, `${stub}.args`), 'utf8')
        .trimEnd()
        .split('\n');
    } catch {
      return undefined;
    }
  }

  annotation(): string | undefined {
    try {
      return readFileSync(join(this.root, 'agent.stdin'), 'utf8');
    } catch {
      return undefined;
    }
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }

  private stub(name: string, body: string) {
    writeFileSync(join(this.bin, name), `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  }
}

const forgiveFtr = (sandbox: Sandbox, env?: Record<string, string | undefined>) =>
  sandbox.run(
    `forgive_skipped_on_main_reports "my config" --junit-file "${sandbox.marker}" target/junit/job -name '*.xml'`,
    env
  );

describe('skipped_on_main.sh', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  afterEach(() => {
    sandbox.dispose();
  });

  it('returns 0 and annotates the build when the evaluator classifies every failure as known skipped', () => {
    sandbox.writeReport('target/junit/job/report-1.xml');
    sandbox.writeReport('target/junit/job/report-2.xml');

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(0);
    expect(output).toContain('all failures in my config are skipped on main since the merge base');

    const nodeArgs = sandbox.calls('node');
    expect(nodeArgs).toEqual(
      expect.arrayContaining([
        'scripts/check_skipped_on_main',
        '--main-ref',
        TARGET_SHA,
        '--base-ref',
        '1111111111111111111111111111111111111111',
        '--head-ref',
        'HEAD',
        '--junit-file',
        'target/junit/job/report-1.xml',
        'target/junit/job/report-2.xml',
      ])
    );
    // one --junit-file per report, nothing else
    expect(nodeArgs?.filter((arg) => arg === '--junit-file')).toHaveLength(2);

    expect(sandbox.calls('agent')).toEqual([
      'annotate',
      '--style',
      'warning',
      '--context',
      'skipped-on-main',
      '--append',
    ]);
    const annotation = sandbox.annotation();
    expect(annotation).toContain('**my config**');
    expect(annotation).toContain(
      '`x-pack/test/a.ts` — suite a test a (https://github.com/elastic/kibana/issues/1)'
    );
    expect(annotation).toContain('`b.spec.ts` — suite b test b');
    expect(annotation).toContain(`(\`${TARGET_SHA.slice(0, 12)}\`)`);
  });

  it('only evaluates reports written after the marker, matching the find expression', () => {
    sandbox.writeReport('target/junit/job/new.xml');
    sandbox.writeStaleReport('target/junit/job/stale.xml');
    sandbox.writeReport('target/junit/job/notes.txt');
    sandbox.writeReport('target/junit/other-job/other.xml');

    expect(forgiveFtr(sandbox).status).toBe(0);

    const reports = sandbox
      .calls('node')
      ?.filter((arg) => arg.endsWith('.xml') || arg.endsWith('.txt'));
    expect(reports).toEqual(['target/junit/job/new.xml']);
  });

  it('keeps failures (returns 1) when the evaluator reports real failures, without annotating', () => {
    sandbox.writeReport('target/junit/job/report.xml');
    sandbox.stubNode({
      stdout: JSON.stringify({
        knownSkipped: [],
        real: [{ kind: 'ftr', file: 'a.ts', fullTitle: 'x' }],
      }),
      exitCode: 1,
    });

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(1);
    expect(output).toContain('keeping failures for my config');
    expect(sandbox.calls('agent')).toBeUndefined();
  });

  it('keeps failures when the evaluator exits 0 but prints something other than JSON', () => {
    sandbox.writeReport('target/junit/job/report.xml');
    sandbox.stubNode({ stdout: 'warning: something went sideways', exitCode: 0 });

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(1);
    expect(output).toContain('evaluator returned invalid JSON');
    expect(sandbox.calls('agent')).toBeUndefined();
  });

  it.each([
    ['an empty knownSkipped list', { knownSkipped: [], real: [] }],
    [
      'a real failure despite exit 0',
      {
        knownSkipped: [{ failure: { kind: 'ftr', file: 'a.ts', fullTitle: 'x' } }],
        real: [{ kind: 'ftr', file: 'a.ts', fullTitle: 'y' }],
      },
    ],
    ['an object without the classification fields', {}],
    ['a JSON value that is not an object', [1, 2]],
  ])('keeps failures when the evaluator exits 0 but reports %s', (_name, evaluation) => {
    sandbox.writeReport('target/junit/job/report.xml');
    sandbox.stubNode({ stdout: JSON.stringify(evaluation), exitCode: 0 });

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(1);
    expect(output).toContain('does not classify every failure as known skipped');
    expect(sandbox.calls('agent')).toBeUndefined();
  });

  it('keeps failures when the evaluator prints nothing', () => {
    sandbox.writeReport('target/junit/job/report.xml');
    sandbox.stubNode({ stdout: '', exitCode: 0 });

    expect(forgiveFtr(sandbox).status).toBe(1);
    expect(sandbox.calls('agent')).toBeUndefined();
  });

  it('keeps failures without invoking the evaluator when no report is newer than the marker', () => {
    sandbox.writeStaleReport('target/junit/job/stale.xml');

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(1);
    expect(output).toContain('no report was written');
    expect(sandbox.calls('node')).toBeUndefined();
    expect(sandbox.calls('git')).toBeUndefined();
  });

  it('keeps failures without invoking the evaluator when the report directory does not exist', () => {
    expect(forgiveFtr(sandbox).status).toBe(1);
    expect(sandbox.calls('node')).toBeUndefined();
  });

  it.each([
    ['not a PR build', { GITHUB_PR_TARGET_BRANCH: undefined }],
    ['no merge base', { GITHUB_PR_MERGE_BASE: undefined }],
    ['flaky test runner', { KIBANA_FLAKY_TEST_RUNNER_CONFIG: '{"configs":[]}' }],
  ])('does not apply when %s', (_name, env) => {
    sandbox.writeReport('target/junit/job/report.xml');

    const { status, output } = forgiveFtr(sandbox, env);

    expect(status).toBe(1);
    expect(output).toContain('not a PR build or flaky test runner');
    expect(sandbox.calls('node')).toBeUndefined();
  });

  it('keeps failures without invoking the evaluator when the target branch cannot be fetched', () => {
    sandbox.writeReport('target/junit/job/report.xml');
    sandbox.stubGit({ fetchExitCode: 128 });

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(1);
    expect(output).toContain('could not fetch origin/main');
    expect(sandbox.calls('node')).toBeUndefined();
  });

  it('fetches the target branch once per shell even across several evaluations', () => {
    sandbox.writeReport('target/junit/job/report.xml');

    const { status } = sandbox.run(
      [
        `forgive_skipped_on_main_reports "first" --junit-file "${sandbox.marker}" target/junit/job -name '*.xml'`,
        `forgive_skipped_on_main_reports "second" --junit-file "${sandbox.marker}" target/junit/job -name '*.xml'`,
      ].join(' && ')
    );

    expect(status).toBe(0);
    expect(sandbox.calls('git')?.filter((arg) => arg === 'fetch')).toHaveLength(1);
  });

  it('still returns 0 when annotating the build fails', () => {
    sandbox.writeReport('target/junit/job/report.xml');
    sandbox.stubBuildkiteAgent({ exitCode: 1 });

    const { status, output } = forgiveFtr(sandbox);

    expect(status).toBe(0);
    expect(output).toContain('failed to annotate build (non-fatal)');
  });

  it('evaluates the Scout failure NDJSON files written since the marker', () => {
    const fresh = sandbox.writeReport(
      '.scout/reports/scout-playwright-test-failures-run1/scout-failures-run1.ndjson',
      '{}'
    );
    sandbox.writeStaleReport(
      '.scout/reports/scout-playwright-test-failures-old/scout-failures-old.ndjson'
    );
    sandbox.writeReport('.scout/reports/scout-playwright-test-failures-run1/other.json');
    sandbox.writeReport('.scout/reports/some-other-report/scout-failures-run1.ndjson');

    const { status } = sandbox.run(
      `forgive_skipped_on_main_scout "scout config" "${sandbox.marker}"`
    );

    expect(status).toBe(0);
    const nodeArgs = sandbox.calls('node') ?? [];
    expect(nodeArgs.filter((arg) => arg === '--scout-failures')).toHaveLength(1);
    expect(nodeArgs).toContain(fresh);
    expect(nodeArgs.filter((arg) => arg.includes('.scout/'))).toEqual([fresh]);
  });
});
