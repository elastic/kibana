/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { basename } from 'path';
import {
  BuildkiteClient,
  findMergeQueueValidation,
  isFullCommitSha,
} from '#pipeline-utils/buildkite';

export const STATIC_CHECKS_FRAGMENT = '.buildkite/pipelines/on_merge/static_checks.yml';
export const ANNOTATION_CONTEXT = 'on-merge-static-checks';

const MAIN_BRANCH = 'main';

export interface PickStaticChecksDeps {
  client: Pick<BuildkiteClient, 'getBuildsForCommit' | 'setAnnotation'>;
  upload: (file: string) => void;
}

// The annotation is informational: a failure to write it must not change the decision.
const annotate = (
  client: PickStaticChecksDeps['client'],
  style: 'info' | 'warning',
  text: string
): void => {
  try {
    client.setAnnotation(ANNOTATION_CONTEXT, style, text);
  } catch (error) {
    console.error('Failed to write the static checks annotation:', error);
  }
};

/**
 * Skips the on-merge static checks only for a commit on `main` that a passed
 * merge-queue build validated. Every other case, including lookup errors,
 * uploads the static checks fragment. The upload is the last action so a retry
 * of this step cannot upload twice.
 */
export const pickStaticChecks = async (
  env: NodeJS.ProcessEnv,
  deps: PickStaticChecksDeps
): Promise<'skipped' | 'uploaded'> => {
  const { BUILDKITE_BRANCH: branch, BUILDKITE_COMMIT: commit } = env;
  const { client, upload } = deps;

  if (branch === MAIN_BRANCH && commit && isFullCommitSha(commit)) {
    const validation = await findMergeQueueValidation(client, commit);

    if (validation.status === 'validated') {
      const { number, web_url: url } = validation.build;
      annotate(
        client,
        'info',
        `Static checks skipped: this commit was validated by merge-queue build #${number} (${url}).`
      );
      return 'skipped';
    }

    if (validation.status === 'error') {
      annotate(
        client,
        'warning',
        `Static checks are running because the merge-queue lookup failed: ${validation.message}`
      );
    }
  }

  upload(STATIC_CHECKS_FRAGMENT);
  return 'uploaded';
};

const main = async (): Promise<void> => {
  await pickStaticChecks(process.env, {
    client: new BuildkiteClient(),
    upload: (file) => {
      execFileSync('buildkite-agent', ['pipeline', 'upload', file], { stdio: 'inherit' });
    },
  });
};

// Filename check instead of `import.meta.main`: the `.buildkite` Jest suite runs as
// CommonJS, where `import.meta` is a syntax error, and this module is imported by its test.
if (basename(process.argv[1] ?? '') === 'pick_static_checks.ts') {
  main().catch((error) => {
    console.error('Failed to pick the static checks:', error);
    process.exit(1);
  });
}
