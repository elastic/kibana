/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import type { EvalsSuiteMetadataEntry } from '../../../pipelines/evals/eval_pipeline.ts';

const repoRoot = join(__dirname, '../../../..');
const script = join(__dirname, 'run_suite.sh');
const suiteInfoScript = 'x-pack/platform/packages/shared/kbn-evals/scripts/ci/get_suite_info.js';
const registry = JSON.parse(
  readFileSync(join(repoRoot, '.buildkite/pipelines/evals/evals.suites.json'), 'utf-8')
) as { suites: EvalsSuiteMetadataEntry[] };

const customer0 = registry.suites.find(({ id }) => id === 'nightshift-investigations-customer0');
const customer0Env = customer0?.ci?.env ?? {};
// Every name the customer0 entry declares; the stub prints them all so the test sees the selection.
const NIGHTSHIFT_VARIABLES = Object.keys(customer0Env);
// The evals Vault config as the pre-command hook hands it to the step (`KBN_EVALS_CONFIG_B64`).
const vaultConfig = (config: Record<string, unknown>) => ({
  KBN_EVALS_CONFIG_B64: Buffer.from(JSON.stringify(config)).toString('base64'),
});
const SANDBOX_BLOCK = {
  sandbox: {
    host: 'sandbox.example.test',
    apiKey: 'sandbox-key',
    ssl: {
      certificate: 'sandbox-cert-pem',
      key: 'sandbox-key-pem',
      certificateAuthorities: 'sandbox-ca-pem',
    },
  },
};
const TELEMETRY_BLOCK = {
  nightshift: { telemetry: { url: 'https://telemetry.example.test', apiKey: 'telemetry-key' } },
};
// What the customer0 suite declares under `ci.requiredConfig`: both blocks in the Vault config.
const CUSTOMER0_SECRETS = vaultConfig({ ...SANDBOX_BLOCK, ...TELEMETRY_BLOCK });

/**
 * Runs the real script with the real suite registry: workspace setup is a no-op, the suite info
 * comes from the real `get_suite_info.js`, and the run stops at the connector setup seam.
 */
const readSelection = (suite: string, env: Record<string, string> = {}) => {
  const directory = mkdtempSync(join(tmpdir(), 'eval-ci-env-'));
  const stub = (path: string, content: string) => {
    mkdirSync(join(directory, dirname(path)), { recursive: true });
    writeFileSync(join(directory, path), content);
  };
  stub('.buildkite/scripts/steps/functional/common.sh', '');
  stub(suiteInfoScript, `require(${JSON.stringify(join(repoRoot, suiteInfoScript))});\n`);
  // Sourced, so it sees the resolved selection and the forwarding helper.
  stub(
    '.buildkite/scripts/steps/evals/setup_connectors.sh',
    `
    printf '%s\n' ${NIGHTSHIFT_VARIABLES.map((name) => `"\${${name}:-}"`).join(' ')}
    suite_ci_env_yaml '  '
    exit 0
  `
  );
  try {
    const lines = execFileSync('bash', [script], {
      cwd: directory,
      env: {
        // A developer's exported credentials must not satisfy or fail the checks.
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            ([name]) => !/^(KBN_EVALS_CONFIG_B64$|SANDBOX_|NIGHTSHIFT_)/.test(name)
          )
        ),
        EVAL_SUITE_ID: suite,
        // Fanout and trigger steps forward unset values as empty strings.
        ...Object.fromEntries(NIGHTSHIFT_VARIABLES.map((name) => [name, ''])),
        ...env,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      // Empty selections print empty lines, so drop only the final newline.
      .replace(/\n$/, '')
      .split('\n');
    const selected = Object.fromEntries(
      NIGHTSHIFT_VARIABLES.map((name, index) => [name, lines[index]])
    );
    return { selected, forwarded: lines.slice(NIGHTSHIFT_VARIABLES.length) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const forwardedYaml = (env: Record<string, string>) =>
  Object.entries(env).map(([name, value]) => `  ${name}: "${value}"`);

describe('suite-declared CI defaults', () => {
  it('runs the customer0 investigations on the selection the registry declares', () => {
    expect(Object.keys(customer0Env).sort()).toEqual(
      [
        'NIGHTSHIFT_DATASETS',
        'NIGHTSHIFT_DATASET_NAME',
        'EVAL_FANOUT_CONCURRENCY',
        'SCOUT_TEST_RETRIES',
      ].sort()
    );
    expect(readSelection('nightshift-investigations-customer0', CUSTOMER0_SECRETS)).toEqual({
      selected: customer0Env,
      forwarded: forwardedYaml(customer0Env),
    });
  });

  it('keeps an explicit build-level value and forwards it in place of the default', () => {
    const override = {
      ...customer0Env,
      NIGHTSHIFT_DATASET_NAME: 'nightshift/customer0-manual-sample10',
    };
    expect(
      readSelection('nightshift-investigations-customer0', {
        ...CUSTOMER0_SECRETS,
        NIGHTSHIFT_DATASET_NAME: 'nightshift/customer0-manual-sample10',
      })
    ).toEqual({ selected: override, forwarded: forwardedYaml(override) });
  });

  const failure = (env: Record<string, string>) => {
    try {
      readSelection('nightshift-investigations-customer0', env);
    } catch (error) {
      return error as { status: number | null; stderr: string };
    }
    throw new Error('expected the step to fail');
  };

  it.each([
    ['no evals config at all', {}],
    ['a config without the telemetry block', vaultConfig(SANDBOX_BLOCK)],
    [
      'a sandbox block missing the client certificate',
      vaultConfig({ sandbox: { host: 'h', apiKey: 'k' }, ...TELEMETRY_BLOCK }),
    ],
    [
      'a telemetry block still holding placeholders',
      vaultConfig({
        ...SANDBOX_BLOCK,
        nightshift: { telemetry: { url: 'REPLACE_ME', apiKey: 'REPLACE_ME' } },
      }),
    ],
  ])('fails the customer0 step before any stack boots with %s', (_case, env) => {
    // Both blocks are declared under `ci.requiredConfig`; the first missing path is named.
    expect(customer0?.ci?.requiredConfig).toContain('nightshift.telemetry.url');
    const result = failure(env);
    expect(result.status).toBe(1);
    const config = env.KBN_EVALS_CONFIG_B64
      ? (JSON.parse(Buffer.from(env.KBN_EVALS_CONFIG_B64, 'base64').toString()) as {
          sandbox?: { ssl?: unknown };
        })
      : undefined;
    const expectedPath = !config
      ? 'sandbox.host'
      : !config.sandbox?.ssl
      ? 'sandbox.ssl.certificate'
      : 'nightshift.telemetry.url';
    expect(result.stderr).toContain(`requires \`${expectedPath}\``);
    expect(result.stderr).not.toContain('sandbox-key');
  });

  it('rejects a build-level override that could not be forwarded as a YAML scalar', () => {
    const result = failure({ ...CUSTOMER0_SECRETS, NIGHTSHIFT_DATASET_NAME: 'a "quoted" name' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NIGHTSHIFT_DATASET_NAME must contain only');
  });

  it.each(['nightshift-investigations', 'agent-builder', 'unregistered-suite'])(
    'leaves a suite without CI defaults alone: %s',
    (suite) => {
      expect(readSelection(suite)).toEqual({
        selected: Object.fromEntries(NIGHTSHIFT_VARIABLES.map((name) => [name, ''])),
        forwarded: [],
      });
    }
  );
});
