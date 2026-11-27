/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import Path from 'path';

const SCRIPT = Path.resolve(__dirname, 'suite_owner_notify.sh');
const SUITE_ID = 'nightshift-investigations';
const SUITE_CHANNEL = '#suite-team';
const DAILY_CHANNEL = '#daily-alerts';
const STEP_KEYS = ['k-golden', 'k-probes'];

const writeExecutable = (file: string, content: string) => {
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o755);
};

const readIfExists = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;

interface RunOptions {
  mode: 'weekly' | 'daily' | 'on-demand';
  branch?: string;
  // Per step key: the outcome `buildkite-agent step get outcome` prints, or 'lookup-error' to fail.
  stepOutcomes?: Record<string, string>;
  stepKeys?: string[];
}

// Runs the script with stubbed `buildkite-agent` and `node`. The node stub records what the
// notify pipeline generator was called with; the generator itself has its own unit tests.
const run = ({ mode, branch = 'main', stepOutcomes = {}, stepKeys = STEP_KEYS }: RunOptions) => {
  const root = fs.mkdtempSync(Path.join(os.tmpdir(), 'suite-owner-notify-'));
  const fakeBin = Path.resolve(root, 'bin');
  fs.mkdirSync(fakeBin);

  writeExecutable(
    Path.resolve(fakeBin, 'buildkite-agent'),
    `#!/usr/bin/env bash
case "\${1:-} \${2:-}" in
  "meta-data keys") exit 0 ;;
  "meta-data get")
    [[ "\${3:-}" == kbn-evals:connectors:* ]] && echo "model-a,model-b"
    exit 0 ;;
  "step get")
    printf '%s\\n' "\${5:-}" >> "\${TEST_ROOT}/step-get-calls"
    IFS=, read -r -a pairs <<<"\${TEST_STEP_OUTCOMES}"
    for pair in "\${pairs[@]}"; do
      if [[ "\${pair%%=*}" == "\${5:-}" ]]; then
        [[ "\${pair#*=}" == "lookup-error" ]] && { echo "step not found" >&2; exit 1; }
        echo "\${pair#*=}"
        exit 0
      fi
    done
    echo passed ;;
  "pipeline upload") touch "\${TEST_ROOT}/uploaded" ;;
esac
`
  );
  writeExecutable(
    Path.resolve(fakeBin, 'node'),
    `#!/usr/bin/env bash
[[ "\${1:-}" == "-e" ]] && exit 0
printf '%s' "\${EVAL_NOTIFY_STEP_OUTCOME:-}" > "\${TEST_ROOT}/notify-step-outcome"
printf '%s' "\${EVAL_SUITE_SLACK_CHANNEL:-}" > "\${TEST_ROOT}/notify-channel"
cp "\${EVAL_TRIAGE_SUMMARY_PATH}" "\${TEST_ROOT}/notify-message"
echo 'steps: []'
`
  );

  const result = spawnSync('bash', [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    // A minimal env, so a CI job's own BUILDKITE_* variables cannot leak into the script.
    env: {
      HOME: root,
      PATH: `${fakeBin}:${process.env.PATH}`,
      KIBANA_DIR: root,
      TEST_ROOT: root,
      TEST_STEP_OUTCOMES: Object.entries(stepOutcomes)
        .map(([key, outcome]) => `${key}=${outcome}`)
        .join(','),
      EVAL_SUITE_ID: SUITE_ID,
      EVAL_SUITE_NAME: 'Nightshift Investigations',
      EVAL_SUITE_SLACK_CHANNEL: SUITE_CHANNEL,
      EVAL_SLACK_NOTIFICATION_CHANNEL: DAILY_CHANNEL,
      EVAL_FANOUT_STEP_KEYS: stepKeys.join(','),
      KBN_EVALS_WEEKLY: mode === 'weekly' ? '1' : '',
      KBN_EVALS_DAILY: mode === 'daily' ? '1' : '',
      BUILDKITE_BRANCH: branch,
      BUILDKITE_PIPELINE_DEFAULT_BRANCH: 'main',
    },
  });

  const outcome = {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    uploaded: fs.existsSync(Path.resolve(root, 'uploaded')),
    stepGetCalls: (readIfExists(Path.resolve(root, 'step-get-calls')) ?? '')
      .split('\n')
      .filter(Boolean),
    notifyStepOutcome: readIfExists(Path.resolve(root, 'notify-step-outcome')),
    notifyChannel: readIfExists(Path.resolve(root, 'notify-channel')),
    message: readIfExists(Path.resolve(root, 'notify-message')),
  };
  fs.rmSync(root, { force: true, recursive: true });
  return outcome;
};

describe('suite_owner_notify.sh with no recorded failures', () => {
  it('posts a daily passed message to the daily channel from a non-blocking step', () => {
    const result = run({ mode: 'daily' });

    expect(result.status).toBe(0);
    expect(result.stepGetCalls).toEqual(STEP_KEYS);
    expect(result.uploaded).toBe(true);
    expect(result.notifyStepOutcome).toBe('passed');
    expect(result.notifyChannel).toBe(DAILY_CHANNEL);
    expect(result.message).toContain(
      ':white_check_mark: *Daily LLM evals* — Nightshift Investigations (`nightshift-investigations`) passed.'
    );
    expect(result.message).toContain('- `model-a`\n- `model-b`');
  });

  it("posts a weekly passed message to the suite's team channel", () => {
    const result = run({ mode: 'weekly' });

    expect(result.uploaded).toBe(true);
    expect(result.notifyStepOutcome).toBe('passed');
    expect(result.notifyChannel).toBe(SUITE_CHANNEL);
    expect(result.message).toContain(':white_check_mark: *Weekly LLM evals*');
  });

  it('posts an unconfirmed message when a step ended without passing or recording a failure', () => {
    const result = run({ mode: 'daily', stepOutcomes: { 'k-probes': 'hard_failed' } });

    expect(result.uploaded).toBe(true);
    expect(result.notifyStepOutcome).toBe('passed');
    expect(result.message).toContain('could not confirm the run passed');
    expect(result.message).toContain(
      'Eval step `k-probes` ended `hard_failed` without recording a failure'
    );
  });

  it('posts an unconfirmed message when a step outcome cannot be read, and checks every step', () => {
    const result = run({ mode: 'weekly', stepOutcomes: { 'k-golden': 'lookup-error' } });

    expect(result.output).toContain('Could not read the outcome of eval step k-golden');
    expect(result.stepGetCalls).toEqual(STEP_KEYS);
    expect(result.uploaded).toBe(true);
    expect(result.message).toContain(
      'could not confirm the run passed. The outcome of eval step `k-golden` could not be read'
    );
  });

  it.each([
    ['daily', 'refs/pull/305981/head'],
    ['weekly', 'feature-branch'],
  ] as const)('checks every step but does not post for a %s build on %s', (mode, branch) => {
    const result = run({ mode, branch, stepOutcomes: { 'k-golden': 'hard_failed' } });

    expect(result.status).toBe(0);
    expect(result.stepGetCalls).toEqual(STEP_KEYS);
    expect(result.uploaded).toBe(false);
    expect(result.output).toContain('No Slack channel for this build (only main posts)');
  });

  it('does not post or check steps for an on-demand run', () => {
    const result = run({ mode: 'on-demand' });

    expect(result.status).toBe(0);
    expect(result.stepGetCalls).toEqual([]);
    expect(result.uploaded).toBe(false);
  });

  it('does not post when the eval step keys are missing', () => {
    const result = run({ mode: 'daily', stepKeys: [] });

    expect(result.status).toBe(0);
    expect(result.uploaded).toBe(false);
    expect(result.output).toContain('EVAL_FANOUT_STEP_KEYS is unset');
  });
});
