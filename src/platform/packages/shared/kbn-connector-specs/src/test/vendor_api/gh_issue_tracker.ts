/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import type { DriftIssue, IssueTracker } from './surface_drift';
import { DRIFT_ISSUE_LABEL } from './surface_drift';

/** Runs `gh api` with an optional JSON body on stdin, and returns its stdout. */
export type RunGhApi = (args: readonly string[], input?: unknown) => Promise<string>;

const runGhApi: RunGhApi = (args, input) =>
  new Promise((resolve, reject) => {
    const child = spawn('gh', ['api', ...args, ...(input === undefined ? [] : ['--input', '-'])]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(stdout)
        : reject(new Error(`gh api ${args[0]} exited with ${code}: ${stderr.trim()}`))
    );
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  });

interface ApiIssue {
  readonly number: number;
  readonly state: 'open' | 'closed';
  readonly body: string | null;
  readonly html_url: string;
}

const toIssue = ({ number, state, body, html_url: url }: ApiIssue): DriftIssue => ({
  number,
  state,
  body: body ?? '',
  url,
});

/** An `IssueTracker` for a repository, using the `gh` CLI and its `GITHUB_TOKEN`. */
export const createGhIssueTracker = (repo: string, ghApi: RunGhApi = runGhApi): IssueTracker => ({
  list: async () => {
    // One issue per line; pull requests share the issues endpoint and are left out.
    const output = await ghApi([
      '--paginate',
      `repos/${repo}/issues?labels=${DRIFT_ISSUE_LABEL}&state=all&per_page=100`,
      '--jq',
      '.[] | select(.pull_request == null) | {number, state, body, html_url}',
    ]);
    return output
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => toIssue(JSON.parse(line)));
  },
  create: async (issue) =>
    toIssue(JSON.parse(await ghApi(['-X', 'POST', `repos/${repo}/issues`], issue))),
  update: async (number, changes) => {
    await ghApi(['-X', 'PATCH', `repos/${repo}/issues/${number}`], changes);
  },
  comment: async (number, body) => {
    await ghApi(['-X', 'POST', `repos/${repo}/issues/${number}/comments`], { body });
  },
});
