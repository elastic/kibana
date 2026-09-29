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
const TOKEN_SCRIPT_PATH = Path.resolve(__dirname, './gcp_oidc_token.sh');
const PROVIDER =
  'projects/1003139005402/locations/global/workloadIdentityPools/buildkite/providers/buildkite';
const PROXY_EMAIL = 'kibana-ci-sa-proxy@elastic-kibana-ci.iam.gserviceaccount.com';
const TARGET_EMAIL = 'kibana-ci-access-artifacts@elastic-kibana-ci.iam.gserviceaccount.com';
const BUCKET = 'ci-artifacts.kibana.dev';
const TOKEN_RESPONSE = 'mock-token-response';

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
set -euo pipefail
printf '%s\\0' "$@" >> "$CALLS_FILE"
printf '\\n' >> "$CALLS_FILE"
if [[ "\${MOCK_FAIL_COMMAND:-}" == "oidc request-token" ]]; then
  echo "Mock token request failure" >&2
  exit 23
fi
printf '%s\\n' '${TOKEN_RESPONSE}'
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

  const runScript = (scriptPath: string, args: string[], env: Record<string, string> = {}) => {
    const result = spawnSync(scriptPath, args, {
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

  const run = (argument = BUCKET, env: Record<string, string> = {}) =>
    runScript(SCRIPT_PATH, [argument], env);
  const requestToken = (env: Record<string, string> = {}) => runScript(TOKEN_SCRIPT_PATH, [], env);
  const cleanup = () => Fs.rmSync(root, { recursive: true, force: true });
  return { root, credentialsDir, run, requestToken, cleanup };
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
    const { credentialsDir, run } = sandbox;
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
        `--executable-command="${TOKEN_SCRIPT_PATH}"`,
        `--output-file=${credentialsFile}`,
      ],
      ['auth', 'login', `--cred-file=${credentialsFile}`, '--quiet', '--no-user-output-enabled'],
      ['config', 'set', 'auth/impersonate_service_account', TARGET_EMAIL],
    ]);
    expect(Fs.existsSync(Path.join(credentialsDir, 'token.jwt'))).toBe(false);
  });

  it('returns only the token response using the audience supplied by gcloud', () => {
    const result = sandbox.requestToken({
      GOOGLE_EXTERNAL_ACCOUNT_AUDIENCE: 'mock-audience',
      BUILDKITE_AGENT_DEBUG: 'true',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${TOKEN_RESPONSE}\n`);
    expect(result.stderr).toBe('');
    expect(result.calls).toEqual([
      [
        'oidc',
        'request-token',
        '--audience=mock-audience',
        '--format=gcp',
        '--log-level=error',
        '--debug=false',
      ],
    ]);
  });

  it('propagates token request failures without writing to stdout', () => {
    const result = sandbox.requestToken({
      GOOGLE_EXTERNAL_ACCOUNT_AUDIENCE: 'mock-audience',
      MOCK_FAIL_COMMAND: 'oidc request-token',
    });

    expect(result.status).toBe(23);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Mock token request failure');
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
    expect(result.calls).toContainEqual([
      'auth',
      'revoke',
      PROXY_EMAIL,
      '--no-user-output-enabled',
    ]);
    expect(Fs.existsSync(credentialsDir)).toBe(false);
  });
});
