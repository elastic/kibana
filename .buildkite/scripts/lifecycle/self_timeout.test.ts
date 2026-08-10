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

const REPO_ROOT = Path.resolve(__dirname, '../../..');
const RUN_COMMAND_PATH = Path.resolve(__dirname, 'run_command.sh');
const POST_COMMAND_PATH = Path.resolve(__dirname, 'post_command.sh');

function writeExecutable(targetPath: string, contents: string) {
  Fs.writeFileSync(targetPath, contents, { mode: 0o755 });
}

function createTestEnvironment() {
  const tempDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kibana-self-timeout-'));
  const binDir = Path.join(tempDir, 'bin');
  const callsFile = Path.join(tempDir, 'calls.log');
  Fs.mkdirSync(binDir);
  Fs.writeFileSync(callsFile, '');

  writeExecutable(
    Path.join(binDir, 'setsid'),
    `#!/usr/bin/env bash
echo "setsid $*" >> "$CALLS_FILE"
if [[ "\${1:-}" == *"/self_timeout_watchdog.sh" ]]; then
  if [[ "\${MOCK_WATCHDOG_FIRES:-}" == "true" ]]; then
    touch "$3"
    exit 0
  fi
  exec /bin/sleep 60
fi
if [[ "\${MOCK_COMMAND_DELAY:-}" != "" ]]; then
  /bin/sleep "$MOCK_COMMAND_DELAY"
fi
exit "\${MOCK_COMMAND_EXIT_STATUS:-0}"
`
  );
  writeExecutable(
    Path.join(binDir, 'buildkite-agent'),
    `#!/usr/bin/env bash
echo "buildkite-agent $*" >> "$CALLS_FILE"
if [[ "\${1:-}" == "meta-data" && "\${2:-}" == "get" ]]; then
  echo "\${MOCK_IS_TEST_EXECUTION_STEP:-}"
fi
`
  );
  for (const command of ['gcloud', 'node', 'ts-node']) {
    writeExecutable(
      Path.join(binDir, command),
      `#!/usr/bin/env bash
echo "${command} $*" >> "$CALLS_FILE"
`
    );
  }

  return {
    tempDir,
    callsFile,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      CALLS_FILE: callsFile,
    },
  };
}

function readCalls(callsFile: string) {
  return Fs.readFileSync(callsFile, 'utf8').split('\n').filter(Boolean);
}

describe('self-timeout lifecycle', function () {
  it('does not wrap commands unless explicitly enabled', function () {
    const testEnvironment = createTestEnvironment();

    try {
      const result = spawnSync('bash', [RUN_COMMAND_PATH], {
        cwd: REPO_ROOT,
        env: {
          ...testEnvironment.env,
          BUILDKITE_COMMAND: 'echo command >> "$CALLS_FILE"',
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(readCalls(testEnvironment.callsFile)).toEqual(['command']);
    } finally {
      Fs.rmSync(testEnvironment.tempDir, { recursive: true, force: true });
    }
  });

  it('defers exit 124 when the watchdog marker exists', function () {
    const testEnvironment = createTestEnvironment();
    const script = `
source "${RUN_COMMAND_PATH}"
printf 'hook_status=%s\\n' "$?"
printf 'deferred_status=%s\\n' "\${KIBANA_SELF_TIMEOUT_EXIT_STATUS:-}"
`;

    try {
      const result = spawnSync('bash', ['-c', script], {
        cwd: REPO_ROOT,
        env: {
          ...testEnvironment.env,
          KIBANA_SELF_TIMEOUT_MINUTES: '48',
          BUILDKITE_COMMAND: 'echo command',
          MOCK_COMMAND_DELAY: '1',
          MOCK_COMMAND_EXIT_STATUS: '137',
          MOCK_WATCHDOG_FIRES: 'true',
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('hook_status=0');
      expect(result.stdout).toContain('deferred_status=124');
      expect(readCalls(testEnvironment.callsFile)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('setsid /bin/bash -ec echo command'),
          expect.stringContaining('setsid .buildkite/scripts/lifecycle/self_timeout_watchdog.sh'),
        ])
      );
    } finally {
      Fs.rmSync(testEnvironment.tempDir, { recursive: true, force: true });
    }
  });

  it('preserves exit 137 when the watchdog marker does not exist', function () {
    const testEnvironment = createTestEnvironment();
    const script = `
source "${RUN_COMMAND_PATH}"
printf 'hook_status=%s\\n' "$?"
printf 'deferred_status=%s\\n' "\${KIBANA_SELF_TIMEOUT_EXIT_STATUS:-}"
`;

    try {
      const result = spawnSync('bash', ['-c', script], {
        cwd: REPO_ROOT,
        env: {
          ...testEnvironment.env,
          KIBANA_SELF_TIMEOUT_MINUTES: '48',
          BUILDKITE_COMMAND: 'echo command',
          MOCK_COMMAND_EXIT_STATUS: '137',
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('hook_status=137');
      expect(result.stdout).toContain('deferred_status=');
    } finally {
      Fs.rmSync(testEnvironment.tempDir, { recursive: true, force: true });
    }
  });

  it('rejects an invalid timeout', function () {
    const testEnvironment = createTestEnvironment();

    try {
      const result = spawnSync('bash', [RUN_COMMAND_PATH], {
        cwd: REPO_ROOT,
        env: {
          ...testEnvironment.env,
          KIBANA_SELF_TIMEOUT_MINUTES: 'invalid',
          BUILDKITE_COMMAND: 'echo command',
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('KIBANA_SELF_TIMEOUT_MINUTES must be a positive integer');
      expect(readCalls(testEnvironment.callsFile)).toEqual([]);
    } finally {
      Fs.rmSync(testEnvironment.tempDir, { recursive: true, force: true });
    }
  });

  it('finishes post-command processing before exiting 124', function () {
    const testEnvironment = createTestEnvironment();

    try {
      const result = spawnSync('bash', [POST_COMMAND_PATH], {
        cwd: REPO_ROOT,
        env: {
          ...testEnvironment.env,
          BUILDKITE_BUILD_URL: 'https://buildkite.example/build',
          BUILDKITE_COMMAND_EXIT_STATUS: '0',
          BUILDKITE_JOB_ID: 'job-id',
          BUILDKITE_TRIGGERED_FROM_BUILD_PIPELINE_SLUG: 'kibana',
          KIBANA_SELF_TIMEOUT_EXIT_STATUS: '124',
          MOCK_IS_TEST_EXECUTION_STEP: 'true',
        },
        encoding: 'utf8',
      });
      const calls = readCalls(testEnvironment.callsFile);
      const artifactUploadIndex = calls.findIndex((call) =>
        call.startsWith('buildkite-agent artifact upload')
      );
      const resultProcessingIndex = calls.findIndex((call) =>
        call.startsWith('node scripts/report_failed_tests')
      );

      expect(result.status).toBe(124);
      expect(artifactUploadIndex).toBeGreaterThanOrEqual(0);
      expect(resultProcessingIndex).toBeGreaterThan(artifactUploadIndex);
    } finally {
      Fs.rmSync(testEnvironment.tempDir, { recursive: true, force: true });
    }
  });
});
