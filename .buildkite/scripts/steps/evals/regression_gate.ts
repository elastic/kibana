/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Regression gate plumbing for PR eval builds; every command is a no-op for a suite without a
// `regressionGate` in evals.suites.json.
//
//   regression_gate.ts args <suite-id> <connector-id>   print the `compare` gate flags, one per line
//   regression_gate.ts pending <suite-id>               post a pending kibana-evals/<suite> status
//   regression_gate.ts pending-runnable <pr-labels>     post it for every gated suite the labels run
//   regression_gate.ts post <suite-id> <verdict-file>   post the verdict as kibana-evals/<suite>

import Fs from 'fs';
import {
  getRunnableEvalSuites,
  readRawEvalsSuites,
} from '../../../pipelines/evals/eval_pipeline.ts';
import { getVerdictStatusContext } from '../../../pipelines/evals/evals_gate_rules.ts';
import {
  getGateCompareArgs,
  toVerdictStatus,
} from '../../../pipelines/evals/regression_gate_status.ts';
import { setCommitStatus } from '#pipeline-utils';

const [command, target, arg] = process.argv.slice(2);

const isPrBuild = (): boolean => {
  const pr = process.env.BUILDKITE_PULL_REQUEST;
  return Boolean(pr) && pr !== 'false';
};

const postStatus = async (
  suiteId: string,
  state: Parameters<typeof setCommitStatus>[0]['state'],
  description: string
): Promise<void> => {
  const context = getVerdictStatusContext(suiteId);
  const sha = process.env.BUILDKITE_COMMIT;
  if (!isPrBuild() || !sha) {
    console.error(`Not a PR build; not posting ${context}.`);
    return;
  }
  await setCommitStatus({
    sha,
    state,
    context,
    description,
    targetUrl: process.env.BUILDKITE_BUILD_URL,
  });
  console.error(`Posted ${context}: ${state} (${description})`);
};

const postPending = (suiteId: string): Promise<void> =>
  postStatus(suiteId, 'pending', `Running ${suiteId} evals`);

const main = async (): Promise<void> => {
  if (!command || target === undefined) {
    throw new Error(
      'Usage: regression_gate.ts <args|pending|pending-runnable|post> <target> [arg]'
    );
  }

  // The trigger step posts this as soon as it hands the suites to the eval pipeline, so a failure
  // before the fanout still leaves a pending verdict for a finished `kibana-evals` build to settle.
  if (command === 'pending-runnable') {
    for (const { id, regressionGate } of getRunnableEvalSuites(target)) {
      if (regressionGate) {
        await postPending(id);
      }
    }
    return;
  }

  const suite = readRawEvalsSuites().find(({ id }) => id === target);
  if (!suite?.regressionGate) {
    return;
  }

  switch (command) {
    case 'args':
      process.stdout.write(getGateCompareArgs(suite, arg ?? '').join('\n'));
      return;
    case 'pending':
      await postPending(suite.id);
      return;
    case 'post': {
      const rawVerdict = arg && Fs.existsSync(arg) ? Fs.readFileSync(arg, 'utf-8') : undefined;
      const { state, description } = toVerdictStatus(rawVerdict);
      await postStatus(suite.id, state, description);
      return;
    }
    default:
      throw new Error(`Unknown command "${command}"`);
  }
};

main().catch((error) => {
  // Best-effort: a failed status post must not turn the eval build red.
  console.error(error);
});
