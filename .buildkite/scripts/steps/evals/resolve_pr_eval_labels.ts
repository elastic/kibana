/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Prints the PR labels `trigger_pr_evals.sh` forwards to kibana-evals-pr-llm-evals, or nothing
// when no suite should run. Logs go to stderr.
//
// The labels are read live, not from the GITHUB_PR_LABELS snapshot taken when the PR build started,
// so a decision label added while CI runs still takes effect. A gated suite whose verdict from an
// earlier PR commit can be reused (no decision path changed since, and no models beyond its
// defaults requested) gets `evals:skip-<id>` instead of re-running, and the verdict is copied onto
// the head commit.

import {
  getForwardablePrLabels,
  getRunnableEvalSuites,
  shouldRunEvals,
} from '../../../pipelines/evals/eval_pipeline.ts';
import type { VerdictLookup } from '../../../pipelines/evals/evals_gate_rules.ts';
import {
  EVALS_SKIP_LABEL_PREFIX,
  findReusableVerdict,
  getVerdictStatusContext,
  requestsModelsBeyondDefaults,
  toVerdict,
  truncateDescription,
} from '../../../pipelines/evals/evals_gate_rules.ts';
import {
  getChangedFilesBetween,
  getCommitStatus,
  setCommitStatus,
  getLivePrLabels,
  getPrCommitShas,
} from '#pipeline-utils';

const verdictLookup: VerdictLookup = {
  listPullRequestCommitShas: getPrCommitShas,
  getVerdict: async (sha, context) => toVerdict(sha, await getCommitStatus(sha, context)),
  listFilesBetween: getChangedFilesBetween,
};

const readLabels = async (): Promise<string> => {
  try {
    return (await getLivePrLabels()).join(',');
  } catch (error) {
    console.error('Could not read the live PR labels; using the build-time snapshot.', error);
    return process.env.GITHUB_PR_LABELS ?? '';
  }
};

const main = async (): Promise<void> => {
  const labels = getForwardablePrLabels(await readLabels())
    .split(',')
    .filter(Boolean);
  const headSha = process.env.BUILDKITE_COMMIT ?? '';

  // A reused verdict only covers the suite's default models, so a PR asking for others runs it.
  const gatedSuites = getRunnableEvalSuites(labels.join(',')).filter(
    (suite) => suite.regressionGate && !requestsModelsBeyondDefaults(labels, suite)
  );
  for (const suite of gatedSuites) {
    try {
      const verdict = await findReusableVerdict({ lookup: verdictLookup, headSha, suite });
      if (verdict) {
        console.error(
          `Reusing the ${suite.id} verdict from ${verdict.sha}: no decision path changed since.`
        );
        labels.push(`${EVALS_SKIP_LABEL_PREFIX}${suite.id}`);
        // The gate ignores a verdict that lands on a commit that's no longer the head, so a pass
        // reused here would never reach it. Copy it onto the head; its status event settles the gate.
        await setCommitStatus({
          sha: headSha,
          // Only passes are ever reused.
          state: 'success',
          context: getVerdictStatusContext(suite.id),
          description: truncateDescription(
            `${verdict.description} (from ${verdict.sha.slice(0, 7)})`
          ),
          targetUrl: process.env.BUILDKITE_BUILD_URL,
        });
      }
    } catch (error) {
      console.error(`Could not look up an earlier ${suite.id} verdict; running it.`, error);
    }
  }

  const forwarded = labels.join(',');
  process.stdout.write(shouldRunEvals(forwarded) ? forwarded : '');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
