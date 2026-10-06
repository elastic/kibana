/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Octokit } from '@octokit/rest';
import { FIXER_WORKFLOW } from './queue.ts';
import type { QueueClient } from './queue.ts';

/** Adapt the Actions GitHub client to the queue without relying on GitHub's search index. */
export const createQueueClient = (
  github: Octokit,
  repository: { owner: string; repo: string }
): QueueClient => ({
  listIssues: (label) =>
    github.paginate(github.rest.issues.listForRepo, {
      ...repository,
      state: 'open',
      labels: label,
      per_page: 100,
    }),
  getIssue: async (number) =>
    (await github.rest.issues.get({ ...repository, issue_number: number })).data,
  listEvents: (number) =>
    github.paginate(github.rest.issues.listEvents, {
      ...repository,
      issue_number: number,
      per_page: 100,
    }),
  listComments: (number) =>
    github.paginate(github.rest.issues.listComments, {
      ...repository,
      issue_number: number,
      per_page: 100,
    }),
  listActiveRuns: async () => {
    const runs = [];
    for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested'] as const) {
      runs.push(
        ...(await github.paginate(github.rest.actions.listWorkflowRuns, {
          ...repository,
          workflow_id: FIXER_WORKFLOW,
          status,
          per_page: 100,
        }))
      );
    }
    return [...new Map(runs.map((run) => [run.id, run])).values()];
  },
  getRun: async (id) =>
    (await github.rest.actions.getWorkflowRun({ ...repository, run_id: id })).data,
  createComment: async (issue, body) =>
    (await github.rest.issues.createComment({ ...repository, issue_number: issue, body })).data.id,
  updateComment: async (id, body) => {
    await github.rest.issues.updateComment({ ...repository, comment_id: id, body });
  },
  dispatch: async ({ issue, event, requestedBy }) => {
    const { data } = await github.request(
      'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
      {
        ...repository,
        workflow_id: FIXER_WORKFLOW,
        ref: 'main',
        return_run_details: true,
        inputs: {
          issue_number: String(issue),
          request_id: String(event),
          requested_by: requestedBy,
        },
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
        request: { retries: 0 },
      }
    );
    return (data as { workflow_run_id: number }).workflow_run_id;
  },
});
