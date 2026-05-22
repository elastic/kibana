/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { spawnSync } from 'child_process';

const SCRIPT_PATH = Path.resolve(__dirname, './pre_build.sh');
const REPO_ROOT = Path.resolve(__dirname, '../../..');

const writeExecutable = (targetPath: string, contents: string) => {
  Fs.writeFileSync(targetPath, contents, { mode: 0o755 });
  Fs.chmodSync(targetPath, 0o755);
};

const createMockBinaries = (binDir: string) => {
  writeExecutable(
    Path.join(binDir, 'buildkite-agent'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "buildkite-agent $*" >> "$CALLS_FILE"
if [[ "\${MOCK_FAIL_CMD:-}" == "buildkite-agent" ]]; then
  echo "forced buildkite-agent failure" >&2
  exit 1
fi
if [[ "\${MOCK_FAIL_CMD:-}" == "buildkite-agent-meta-data-set" && "\${1:-}" == "meta-data" && "\${2:-}" == "set" ]]; then
  echo "forced metadata set failure" >&2
  exit 1
fi
if [[ "\${1:-}" == "annotate" ]]; then
  cat >/dev/null
fi
exit 0
`
  );

  writeExecutable(
    Path.join(binDir, 'curl'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "curl $*" >> "$CALLS_FILE"
if [[ "\${MOCK_FAIL_CMD:-}" == "curl" ]]; then
  echo "forced curl failure" >&2
  exit 1
fi
echo '{"bucket":"mock-bucket"}'
`
  );

  writeExecutable(
    Path.join(binDir, 'jq'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "jq $*" >> "$CALLS_FILE"
cat >/dev/null || true
if [[ "\${MOCK_FAIL_CMD:-}" == "jq" ]]; then
  echo "forced jq failure" >&2
  exit 1
fi
if [[ "$*" == *".version"* ]]; then
  echo "9.9.9"
  exit 0
fi
if [[ "$*" == *".bucket"* ]]; then
  echo "mock-bucket"
  exit 0
fi
exit 0
`
  );

  writeExecutable(
    Path.join(binDir, 'ts-node'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "ts-node $*" >> "$CALLS_FILE"
if [[ "\${MOCK_FAIL_CMD:-}" == "ts-node" ]]; then
  echo "forced ts-node failure" >&2
  exit 1
fi
exit 0
`
  );

  writeExecutable(
    Path.join(binDir, 'gh'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "gh $*" >> "$CALLS_FILE"
exit 0
`
  );
};

const runPreBuildScript = (overrides: Record<string, string> = {}) => {
  const tempDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kibana-pre-build-'));
  const binDir = Path.join(tempDir, 'bin');
  Fs.mkdirSync(binDir, { recursive: true });
  const callsFile = Path.join(tempDir, 'calls.log');
  Fs.writeFileSync(callsFile, '');

  createMockBinaries(binDir);

  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH ?? ''}`,
    CALLS_FILE: callsFile,
    KIBANA_GITHUB_BUILD_COMMIT_STATUS_ENABLED: 'true',
    ...overrides,
  };

  try {
    const result = spawnSync('bash', [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env,
      encoding: 'utf-8',
    });

    const calls = Fs.readFileSync(callsFile, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      ...result,
      calls,
    };
  } finally {
    Fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const hasCall = (calls: string[], value: string) => calls.some((call) => call.includes(value));

describe('lifecycle pre_build.sh', () => {
  it('succeeds and records expected metadata calls for PR builds', () => {
    const result = runPreBuildScript({
      BUILDKITE_PULL_REQUEST_BASE_BRANCH: 'main',
      GITHUB_PR_DRAFT: 'true',
      GITHUB_PR_LABELS: 'ci:foo,ci:bar',
    });

    expect(result.status).toBe(0);
    expect(result.calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ts-node '),
        expect.stringContaining('ci_stats_start.ts'),
        expect.stringContaining(
          'buildkite-agent meta-data set ES_SNAPSHOT_MANIFEST_DEFAULT https://storage.googleapis.com/mock-bucket/manifest.json'
        ),
        expect.stringContaining('buildkite-agent meta-data set ingest:is_draft_pr true'),
        expect.stringContaining('buildkite-agent meta-data set ingest:pr_labels ci:foo,ci:bar'),
      ])
    );
  });

  it('does not execute CI Stats network path in this test harness', () => {
    const result = runPreBuildScript();

    expect(result.status).toBe(0);
    // We stub ts-node itself, so ci_stats_start.ts is not executed in tests.
    expect(hasCall(result.calls, 'ts-node ')).toBe(true);
    // If ci_stats_start.ts had run, it would set ci_stats_build_id via buildkite-agent meta-data.
    expect(hasCall(result.calls, 'buildkite-agent meta-data set ci_stats_build_id')).toBe(false);
  });

  it('annotates when Kibana build reuse env is present', () => {
    const reusableJobUrl = 'https://buildkite.com/example/reused-job';
    const result = runPreBuildScript({
      KIBANA_BUILD_ID: 'build-id-123',
      KIBANA_REUSABLE_BUILD_JOB_URL: reusableJobUrl,
    });

    expect(result.status).toBe(0);
    expect(result.calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'buildkite-agent annotate --style default --context kibana-reusable-build'
        ),
      ])
    );
  });

  it('does not set ingest metadata when base branch is empty', () => {
    const result = runPreBuildScript({
      BUILDKITE_PULL_REQUEST_BASE_BRANCH: '',
      GITHUB_PR_DRAFT: 'true',
      GITHUB_PR_LABELS: 'ci:foo',
    });

    expect(result.status).toBe(0);
    expect(hasCall(result.calls, 'buildkite-agent meta-data set ingest:is_draft_pr')).toBe(false);
    expect(hasCall(result.calls, 'buildkite-agent meta-data set ingest:pr_labels')).toBe(false);
  });

  it('does not set ingest:pr_labels when labels are empty', () => {
    const result = runPreBuildScript({
      BUILDKITE_PULL_REQUEST_BASE_BRANCH: 'main',
      GITHUB_PR_DRAFT: 'false',
      GITHUB_PR_LABELS: '',
    });

    expect(result.status).toBe(0);
    expect(hasCall(result.calls, 'buildkite-agent meta-data set ingest:is_draft_pr false')).toBe(
      true
    );
    expect(hasCall(result.calls, 'buildkite-agent meta-data set ingest:pr_labels')).toBe(false);
  });

  it('fails when buildkite metadata write fails', () => {
    const result = runPreBuildScript({
      MOCK_FAIL_CMD: 'buildkite-agent-meta-data-set',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('forced metadata set failure');
    expect(result.calls).toEqual(
      expect.arrayContaining([expect.stringContaining('buildkite-agent meta-data set')])
    );
  });

  it('fails when manifest resolution command fails', () => {
    const result = runPreBuildScript({
      MOCK_FAIL_CMD: 'curl',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('forced curl failure');
    expect(result.calls).toEqual(expect.arrayContaining([expect.stringContaining('curl -s')]));
  });
});
