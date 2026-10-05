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
const OTHER_EMAIL = 'kibana-ci-access-so-snapshots@elastic-kibana-ci.iam.gserviceaccount.com';
const BUCKET = 'ci-artifacts.kibana.dev';
const TOKEN_RESPONSE = 'mock-token-response';
const QUOTA_ERROR = 'Error code quota_exceeded: [Security Token Service] throttled';

const writeExecutable = (targetPath: string, contents: string) => {
  Fs.writeFileSync(targetPath, contents, { mode: 0o755 });
};

const setupSandbox = () => {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kibana wif test-'));
  const bin = Path.join(root, 'bin');
  const gcloudConfig = Path.join(root, 'gcloud-config');
  const credentialsDir = Path.join(root, 'credentials');
  const callsFile = Path.join(root, 'calls.log');
  const mintCountFile = Path.join(root, 'mint-count');
  Fs.mkdirSync(bin);
  Fs.mkdirSync(gcloudConfig);
  Fs.writeFileSync(callsFile, '');
  Fs.writeFileSync(mintCountFile, '0');

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
    Path.join(bin, 'sleep'),
    `#!/usr/bin/env bash
printf '%s\\0' sleep "$@" >> "$CALLS_FILE"
printf '\\n' >> "$CALLS_FILE"
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
  "auth print-access-token")
    printf 'env\\0override=%s\\0impersonate=%s\\0token_file=[%s]\\0\\n' \\
      "$CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE" "$CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT" \\
      "\${CLOUDSDK_AUTH_ACCESS_TOKEN_FILE-unset}" >> "$CALLS_FILE"
    count=$(( $(cat "$MINT_COUNT_FILE") + 1 ))
    echo "$count" > "$MINT_COUNT_FILE"
    if (( count <= \${MOCK_MINT_FAILURES:-0} )); then
      echo "\${MOCK_MINT_ERROR:-}" >&2
      exit 1
    fi
    echo "token-$count"
    ;;
  "iam workload-identity-pools")
    for arg in "$@"; do [[ "$arg" == --output-file=* ]] && echo '{}' > "\${arg#--output-file=}"; done
    ;;
  "auth login" | "auth revoke" | "config set" | "config unset") ;;
  *) echo "Unexpected gcloud command: $*" >&2; exit 1 ;;
esac
`
  );

  const runScript = (scriptPath: string, args: string[], env: Record<string, string> = {}) => {
    Fs.writeFileSync(callsFile, '');
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
        MINT_COUNT_FILE: mintCountFile,
        ...env,
      },
    });
    const calls = Fs.readFileSync(callsFile, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((call) => call.split('\0').slice(0, -1));
    return { ...result, calls };
  };

  const run = (args: string[] = [BUCKET], env: Record<string, string> = {}) =>
    runScript(SCRIPT_PATH, args, env);
  const requestToken = (env: Record<string, string> = {}) => runScript(TOKEN_SCRIPT_PATH, [], env);
  const tokenFile = (email: string) => Path.join(credentialsDir, `${email}.token`);
  const cleanup = () => Fs.rmSync(root, { recursive: true, force: true });
  return { credentialsDir, run, requestToken, tokenFile, cleanup };
};

const mints = (calls: string[][]) => calls.filter(([command]) => command === 'env');

describe('GCS service account activation', () => {
  let sandbox: ReturnType<typeof setupSandbox>;

  beforeEach(() => {
    sandbox = setupSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('mints one impersonated token and points gcloud at it instead of impersonating', () => {
    const { credentialsDir, run, tokenFile } = sandbox;
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
      ['auth', 'print-access-token', '--verbosity=error'],
      ['env', `override=${credentialsFile}`, `impersonate=${TARGET_EMAIL}`, 'token_file=[]'],
      ['config', 'unset', 'auth/impersonate_service_account'],
      ['config', 'unset', 'auth/access_token_file'],
      ['config', 'set', 'auth/access_token_file', tokenFile(TARGET_EMAIL)],
    ]);
    expect(Fs.readFileSync(tokenFile(TARGET_EMAIL), 'utf-8')).toBe('token-1\n');
  });

  it('reuses a fresh token per service account and mints again for another one', () => {
    const { run } = sandbox;
    expect(run().status).toBe(0);

    const sameAccount = run([`gs://kibana-ci-artifacts-us-central1`]);
    expect(sameAccount.status).toBe(0);
    expect(sameAccount.stdout).toContain(`Reusing access token for ${TARGET_EMAIL}`);
    expect(mints(sameAccount.calls)).toHaveLength(0);

    const otherAccount = run(['kibana-so-types-snapshots']);
    expect(otherAccount.status).toBe(0);
    expect(mints(otherAccount.calls)).toEqual([
      ['env', expect.any(String), `impersonate=${OTHER_EMAIL}`, 'token_file=[]'],
    ]);
  });

  it('mints a new token once the cached one is 30 minutes old', () => {
    const { run, tokenFile } = sandbox;
    expect(run().status).toBe(0);
    const staleTime = new Date(Date.now() - 31 * 60 * 1000);
    Fs.utimesSync(tokenFile(TARGET_EMAIL), staleTime, staleTime);

    const result = run();

    expect(result.status).toBe(0);
    expect(mints(result.calls)).toHaveLength(1);
    expect(Fs.readFileSync(tokenFile(TARGET_EMAIL), 'utf-8')).toBe('token-2\n');
  });

  it('retries rate limited token exchanges with a backoff', () => {
    const result = sandbox.run([BUCKET], { MOCK_MINT_FAILURES: '2', MOCK_MINT_ERROR: QUOTA_ERROR });

    expect(result.status).toBe(0);
    expect(mints(result.calls)).toHaveLength(3);
    expect(result.calls.filter(([command]) => command === 'sleep')).toHaveLength(2);
    expect(Fs.readFileSync(sandbox.tokenFile(TARGET_EMAIL), 'utf-8')).toBe('token-3\n');
  });

  it.each([
    { name: 'a non rate limit error', failures: '1', error: 'Permission denied', attempts: 1 },
    { name: 'persistent rate limiting', failures: '99', error: QUOTA_ERROR, attempts: 5 },
  ])('fails without touching the gcloud config on $name', ({ failures, error, attempts }) => {
    const result = sandbox.run([BUCKET], { MOCK_MINT_FAILURES: failures, MOCK_MINT_ERROR: error });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error);
    expect(result.stderr).toContain(`Failed to mint an access token for ${TARGET_EMAIL}.`);
    expect(mints(result.calls)).toHaveLength(attempts);
    expect(result.calls.some(([command]) => command === 'config')).toBe(false);
    expect(Fs.existsSync(sandbox.tokenFile(TARGET_EMAIL))).toBe(false);
  });

  it('logs in and impersonates with --auto-refresh so gcloud keeps refreshing credentials', () => {
    const { credentialsDir, run } = sandbox;
    const result = run(['--auto-refresh', 'kibana-ci-access-chromium-blds']);

    expect(result.status).toBe(0);
    expect(mints(result.calls)).toHaveLength(0);
    expect(result.calls.slice(1)).toEqual([
      [
        'auth',
        'login',
        `--cred-file=${Path.join(credentialsDir, 'credentials.json')}`,
        '--quiet',
        '--no-user-output-enabled',
      ],
      ['config', 'unset', 'auth/impersonate_service_account'],
      ['config', 'unset', 'auth/access_token_file'],
      [
        'config',
        'set',
        'auth/impersonate_service_account',
        'kibana-ci-access-chromium-blds@elastic-kibana-ci.iam.gserviceaccount.com',
      ],
    ]);
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

  it('clears the gcloud auth config, revokes the proxy account and removes credentials on logout', () => {
    const { credentialsDir, run } = sandbox;
    expect(run().status).toBe(0);

    const result = run(['--logout-gcloud'], { MOCK_ACTIVE_ACCOUNT: PROXY_EMAIL });

    expect(result.status).toBe(0);
    expect(result.calls).toEqual([
      ['config', 'unset', 'auth/impersonate_service_account'],
      ['config', 'unset', 'auth/access_token_file'],
      ['auth', 'list'],
      ['auth', 'revoke', PROXY_EMAIL, '--no-user-output-enabled'],
    ]);
    expect(Fs.existsSync(credentialsDir)).toBe(false);
  });
});
