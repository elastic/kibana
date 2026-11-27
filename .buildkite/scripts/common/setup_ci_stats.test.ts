/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';

const setupScript = Path.resolve(__dirname, 'setup_ci_stats.sh');
const tokenScript = Path.resolve(__dirname, 'ci_stats_oidc_token.sh');

describe('CI Stats job setup', () => {
  let root: string;

  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ci-stats-setup-'));
    Fs.writeFileSync(Path.join(root, 'calls'), '');
    Fs.writeFileSync(
      Path.join(root, 'buildkite-agent'),
      `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALLS_FILE"
case "$1 $2" in
  "meta-data get") printf '%s' "\${MOCK_BUILD_ID:-}" ;;
  "oidc request-token") printf '%s' mock-oidc-token ;;
  *) exit 1 ;;
esac
`,
      { mode: 0o755 }
    );
  });

  afterEach(() => {
    Fs.rmSync(root, { recursive: true, force: true });
  });

  const runSetup = (pipeline: string, env: Record<string, string> = {}) => {
    const result = spawnSync(
      'bash',
      [
        '-c',
        `vault_get() {
  printf 'vault_get %s\\n' "$*" >> "$CALLS_FILE"
  case "$2" in
    api_token) printf '%s' mock-upstream-token ;;
    api_host) printf '%s' ci-stats.kibana.dev ;;
    *) return 1 ;;
  esac
}
source "$1"
jq -cn \\
  --arg authType "$CI_STATS_AUTH_TYPE" \\
  --arg apiUrl "$CI_STATS_API_URL" \\
  --arg token "\${CI_STATS_TOKEN-unset}" \\
  --arg host "\${CI_STATS_HOST-unset}" \\
  --arg config "\${KIBANA_CI_STATS_CONFIG-unset}" \\
  '{authType: $authType, apiUrl: $apiUrl, token: $token, host: $host, config: $config}'`,
        'ci-stats-test',
        setupScript,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${root}:${process.env.PATH}`,
          CALLS_FILE: Path.join(root, 'calls'),
          BUILDKITE_PIPELINE_SLUG: pipeline,
          ACCESS_BROKER_URL: 'https://broker.example',
          MOCK_BUILD_ID: 'build-id',
          CI_STATS_TOKEN: 'inherited-token',
          CI_STATS_HOST: 'inherited-host',
          ...env,
        },
      }
    );
    expect(result.status).toBe(0);
    const output: {
      authType: string;
      apiUrl: string;
      token: string;
      host: string;
      config: string;
    } = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '');
    return { output, calls: Fs.readFileSync(Path.join(root, 'calls'), 'utf8') };
  };

  it('configures the PR broker without reading secrets or minting an OIDC token', () => {
    const { output, calls } = runSetup('kibana-pull-request');
    expect(output).toMatchObject({
      authType: 'buildkite_oidc',
      apiUrl: 'https://broker.example/proxy/kibana.ci_stats',
      token: 'unset',
      host: 'unset',
    });
    expect(JSON.parse(output.config)).toEqual({
      buildId: 'build-id',
      apiUrl: output.apiUrl,
      authType: 'buildkite_oidc',
    });
    expect(calls).toBe('meta-data get ci_stats_build_id --default \n');
  });

  it('uses the production broker by default', () => {
    const { output } = runSetup('kibana-pull-request', { ACCESS_BROKER_URL: '' });
    expect(output.apiUrl).toBe('https://access-broker.kibana.dev/proxy/kibana.ci_stats');
  });

  it('accepts a broker origin with a trailing slash', () => {
    const { output } = runSetup('kibana-pull-request', {
      ACCESS_BROKER_URL: 'https://broker.example/',
    });
    expect(output.apiUrl).toBe('https://broker.example/proxy/kibana.ci_stats');
  });

  it('does not leave an inherited reporter config when a build has not started', () => {
    const { output } = runSetup('kibana-pull-request', {
      MOCK_BUILD_ID: '',
      KIBANA_CI_STATS_CONFIG: '{"apiToken":"inherited-token"}',
    });
    expect(output.config).toBe('unset');
  });

  it('preserves direct authentication for other pipelines', () => {
    const { output, calls } = runSetup('kibana-on-merge');
    expect(output).toMatchObject({ authType: 'token', token: 'mock-upstream-token' });
    expect(JSON.parse(output.config)).toEqual({
      buildId: 'build-id',
      apiUrl: 'https://ci-stats.kibana.dev',
      apiToken: 'mock-upstream-token',
      authType: 'token',
    });
    expect(calls).toContain('vault_get kibana_ci_stats api_token\n');
    expect(calls).toContain('vault_get kibana_ci_stats api_host\n');
    expect(calls).not.toContain('oidc request-token');
  });

  it('requests a short-lived token for the broker audience with cluster and queue claims', () => {
    const result = spawnSync('bash', [tokenScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${root}:${process.env.PATH}`,
        CALLS_FILE: Path.join(root, 'calls'),
      },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('mock-oidc-token');
    expect(Fs.readFileSync(Path.join(root, 'calls'), 'utf8')).toBe(
      'oidc request-token --audience elastic-access-broker --lifetime 300 --claim cluster_id,queue_id,queue_key\n'
    );
  });
});
