/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Octokit } from '@octokit/rest';
import { getTeamLabels } from './team_labels.ts';

interface Options {
  github: Pick<Octokit, 'paginate' | 'rest'>;
  core: { info: (message: string) => void; warning: (message: string) => void };
  owner: string;
  repo: string;
  issueNumber: number;
  prNumber: number;
}

/** Copy the source issue's ownership labels to its newly created fix PR. */
export const labelFlakyFixPr = async ({
  github,
  core,
  owner,
  repo,
  issueNumber,
  prNumber,
}: Options): Promise<void> => {
  if (
    !Number.isSafeInteger(issueNumber) ||
    issueNumber <= 0 ||
    !Number.isSafeInteger(prNumber) ||
    prNumber <= 0 ||
    issueNumber === prNumber
  ) {
    throw new Error('Expected distinct positive source issue and fix PR numbers');
  }

  const sourceLabels = await github.paginate(github.rest.issues.listLabelsOnIssue, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const labels = getTeamLabels(sourceLabels);
  if (labels.length === 0) {
    core.warning(
      `Source issue #${issueNumber} has no ownership labels to copy to PR #${prNumber}.`
    );
    return;
  }

  await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels });
  core.info(
    `Copied ownership labels from issue #${issueNumber} to PR #${prNumber}: ${labels.join(', ')}`
  );
};
