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

const SCRIPT_PATH = Path.resolve(__dirname, './activate_service_account.sh');
const PROVIDER =
  'projects/1003139005402/locations/global/workloadIdentityPools/buildkite/providers/buildkite';
const AUDIENCE = `//iam.googleapis.com/${PROVIDER}`;
const PROXY_EMAIL = 'kibana-ci-sa-proxy@elastic-kibana-ci.iam.gserviceaccount.com';
const TARGET_EMAIL = 'kibana-ci-access-artifacts@elastic-kibana-ci.iam.gserviceaccount.com';
const BUCKET = 'ci-artifacts.kibana.dev';

const writeExecutable = (targetPath: string, contents: string) => {
  Fs.writeFileSync(targetPath, contents, { mode: 0o755 });
};

const setupSandbox = () => {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kibana wif test-'));
  const bin = Path.join(root, 'bin');
  const gcloudConfig = Path.join(root, 'gcloud-config');
  const credentialsDir = Path.join(root, 'credentials');
  const callsFile = Path.join(root, 'calls.log');
  Fs.mkdirSync(bin);
  Fs.mkdirSync(gcloudConfig);
  Fs.writeFileSync(callsFile, '');

  writeExecutable(
    Path.join(bin, 'buildkite-agent'),
    `#!/usr/bin/env bash
echo "Token requests should be delegated to gcloud." >&2
exit 1
`
  );
  writeExecutable(
    Path.join(bin, 'gcloud'),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\0' "$@" >> "$CALLS_FILE"
printf '\\n' >> "$CALLS_FILE"
if [[ "$1 $2" == "\${MOCK_FAIL_COMMAND:-}" ]]; then
  echo "Mock gcloud failure" >&2
  exit 23
fi
case "$1 $2" in
  "auth list") printf '%s\\n' "\${MOCK_ACTIVE_ACCOUNT:-}" ;;
  "iam workload-identity-pools" | "auth login" | "auth revoke" | "config set" | "config unset") ;;
  *) echo "Unexpected gcloud command: $*" >&2; exit 1 ;;
esac
`
  );

  const run = (argument = BUCKET, env: Record<string, string> = {}) => {
    const result = spawnSync('bash', [SCRIPT_PATH, argument], {
      cwd: root,
      encoding: 'utf-8',
      env: {
        PATH: `${bin}:${process.env.PATH ?? ''}`,
        HOME: root,
        TMPDIR: root,
        CLOUDSDK_CONFIG: gcloudConfig,
        KIBANA_WIF_CREDENTIALS_DIR: credentialsDir,
        GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES: '1',
        CALLS_FILE: callsFile,
        ...env,
      },
    });
    const calls = Fs.readFileSync(callsFile, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((call) => call.split('\0').slice(0, -1));
    return { ...result, calls };
  };

  const cleanup = () => Fs.rmSync(root, { recursive: true, force: true });
  return { root, bin, credentialsDir, run, cleanup };
};

describe('GCS service account activation', () => {
  let sandbox: ReturnType<typeof setupSandbox>;

  beforeEach(() => {
    sandbox = setupSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('configures executable credentials and logs in noninteractively', () => {
    const { bin, credentialsDir, run } = sandbox;
    const credentialsFile = Path.join(credentialsDir, 'credentials.json');
    const result = run();

    expect(result.status).toBe(0);
    expect(result.calls).toEqual([
      [
        'iam',
        'workload-identity-pools',
        'create-cred-config',
        PROVIDER,
        `--service-account=${PROXY_EMAIL}`,
        `--executable-command="${Path.join(bin, 'buildkite-agent')}" oidc request-token --audience="${AUDIENCE}" --format=gcp --log-level=error --debug=false`,
        `--output-file=${credentialsFile}`,
      ],
      ['auth', 'login', `--cred-file=${credentialsFile}`, '--quiet', '--no-user-output-enabled'],
      ['config', 'set', 'auth/impersonate_service_account', TARGET_EMAIL],
    ]);
    expect(Fs.existsSync(Path.join(credentialsDir, 'token.jwt'))).toBe(false);
  });

  it('rebinds an active proxy account to credentials for the next job', () => {
    const { root, credentialsDir, run } = sandbox;
    expect(run().status).toBe(0);

    const nextCredentialsDir = Path.join(root, 'next-job');
    const result = run(BUCKET, {
      KIBANA_WIF_CREDENTIALS_DIR: nextCredentialsDir,
      MOCK_ACTIVE_ACCOUNT: PROXY_EMAIL,
    });

    expect(result.status).toBe(0);
    expect(
      result.calls.filter(([command, action]) => command === 'auth' && action === 'login')
    ).toEqual(
      [credentialsDir, nextCredentialsDir].map((directory) => [
        'auth',
        'login',
        `--cred-file=${Path.join(directory, 'credentials.json')}`,
        '--quiet',
        '--no-user-output-enabled',
      ])
    );
  });

  it.each([
    { command: 'iam workload-identity-pools', exitCode: 23 },
    { command: 'auth login', exitCode: 1 },
  ])('stops before impersonation when $command fails', ({ command, exitCode }) => {
    const result = sandbox.run(BUCKET, { MOCK_FAIL_COMMAND: command });

    expect(result.status).toBe(exitCode);
    expect(result.stderr).toContain('Mock gcloud failure');
    expect(result.stdout).not.toContain('Activated service account');
    expect(result.calls.some(([action]) => action === 'config')).toBe(false);
  });

  it('revokes the proxy account and removes its credential directory on logout', () => {
    const { credentialsDir, run } = sandbox;
    expect(run().status).toBe(0);

    const result = run('--logout-gcloud', { MOCK_ACTIVE_ACCOUNT: PROXY_EMAIL });

    expect(result.status).toBe(0);
    expect(result.calls).toContainEqual(['auth', 'revoke', PROXY_EMAIL, '--no-user-output-enabled']);
    expect(Fs.existsSync(credentialsDir)).toBe(false);
  });
});
