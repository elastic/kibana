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
import { hasApiBudget } from './api_budget.ts';
import type { ApiBudget } from './api_budget.ts';
import type { Issue, QueueClient } from './queue.ts';

interface OwnershipIssue {
  number: number;
  __typename: 'Issue' | 'PullRequest';
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  labels: {
    totalCount: number;
    nodes: Array<{ name: string } | null>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface OwnershipResponse {
  repository: Record<string, OwnershipIssue | null> | null;
  rateLimit: { cost: number; remaining: number; resetAt: string };
}

const OWNERSHIP_FIELDS = `
  number
  state
  labels(first: 100) {
    totalCount
    nodes { name }
    pageInfo { hasNextPage endCursor }
  }
`;

/** Adapt the Actions GitHub client to the queue without relying on GitHub's search index. */
export const createQueueClient = (
  github: Octokit,
  repository: { owner: string; repo: string },
  log: (message: string) => void = () => {}
): QueueClient => {
  const observed: Partial<Record<keyof ApiBudget, ApiBudget['rest']>> = {};
  github.hook.after('request', (response) => {
    const resource = response.headers['x-ratelimit-resource'];
    if (resource !== 'core' && resource !== 'graphql') return;
    const key = resource === 'core' ? 'rest' : 'graphql';
    const value = {
      limit: Number(response.headers['x-ratelimit-limit']),
      remaining: Number(response.headers['x-ratelimit-remaining']),
      reset: Number(response.headers['x-ratelimit-reset']),
    };
    if (!Object.values(value).every(Number.isFinite)) return;
    const previous = observed[key];
    if (previous && previous.reset > Date.now() / 1000 && previous.remaining < value.remaining)
      return;
    observed[key] = value;
  });

  const getApiBudget = async (): Promise<ApiBudget> => {
    const { data } = await github.rest.rateLimit.get();
    const { core: rest, graphql } = data.resources;
    if (!graphql) throw new Error('GraphQL API budget is unavailable');
    const budget: ApiBudget = { rest, graphql };
    for (const key of ['rest', 'graphql'] as const) {
      const value = observed[key];
      if (value && value.reset > Date.now() / 1000 && value.remaining < budget[key].remaining) {
        budget[key] = value;
      }
    }
    log(
      `API budget: REST ${budget.rest.remaining}/${budget.rest.limit} (reset ${budget.rest.reset}); ` +
        `GraphQL ${budget.graphql.remaining}/${budget.graphql.limit} (reset ${budget.graphql.reset}).`
    );
    return budget;
  };

  const getIssues = async (numbers: number[]): Promise<Issue[] | null> => {
    const unique = [...new Set(numbers)];
    if (unique.some((number) => !Number.isSafeInteger(number) || number < 1)) {
      throw new Error('Ownership reads require positive integer issue numbers');
    }
    const issues: Issue[] = [];
    for (let offset = 0; offset < unique.length; offset += 50) {
      if (!hasApiBudget(await getApiBudget())) return null;
      const batch = unique.slice(offset, offset + 50);
      const fields = batch
        .map(
          (number) => `issue_${number}: issueOrPullRequest(number: ${number}) {
          __typename
          ... on Issue { ${OWNERSHIP_FIELDS} }
          ... on PullRequest { ${OWNERSHIP_FIELDS} }
        }`
        )
        .join('\n');
      const response = await github.graphql<OwnershipResponse>(
        `query Ownership($owner: String!, $repo: String!) {
          rateLimit { cost remaining resetAt }
          repository(owner: $owner, name: $repo) { ${fields} }
        }`,
        repository
      );
      log(
        `Ownership batch: ${batch.length} issues, GraphQL cost ${response.rateLimit.cost}, ` +
          `remaining ${response.rateLimit.remaining}, reset ${response.rateLimit.resetAt}.`
      );
      for (const number of batch) {
        const issue = response.repository?.[`issue_${number}`];
        if (!issue || issue.number !== number) {
          throw new Error(`Incomplete ownership response for issue #${number}`);
        }
        const labels = [...issue.labels.nodes];
        let page = issue.labels;
        const cursors = new Set<string>();
        while (page.pageInfo.hasNextPage) {
          const cursor = page.pageInfo.endCursor;
          if (!cursor || cursors.has(cursor)) {
            throw new Error(`Invalid label pagination for issue #${number}`);
          }
          cursors.add(cursor);
          if (!hasApiBudget(await getApiBudget())) return null;
          const next = await github.graphql<OwnershipResponse>(
            `query OwnershipLabels($owner: String!, $repo: String!, $number: Int!, $cursor: String!) {
              rateLimit { cost remaining resetAt }
              repository(owner: $owner, name: $repo) {
                issue: issueOrPullRequest(number: $number) {
                  __typename
                  ... on Issue { ${OWNERSHIP_FIELDS.replace(
                    'labels(first: 100)',
                    'labels(first: 100, after: $cursor)'
                  )} }
                  ... on PullRequest { ${OWNERSHIP_FIELDS.replace(
                    'labels(first: 100)',
                    'labels(first: 100, after: $cursor)'
                  )} }
                }
              }
            }`,
            { ...repository, number, cursor }
          );
          const nextIssue = next.repository?.issue;
          if (!nextIssue || nextIssue.number !== number) {
            throw new Error(`Incomplete ownership response for issue #${number}`);
          }
          page = nextIssue.labels;
          if (page.totalCount !== issue.labels.totalCount) {
            throw new Error(`Labels changed during ownership read for issue #${number}`);
          }
          labels.push(...page.nodes);
        }
        if (labels.length !== issue.labels.totalCount || labels.some((label) => !label)) {
          throw new Error(`Incomplete labels for issue #${number}`);
        }
        const names = labels.flatMap((label) => (label ? [label.name] : []));
        if (new Set(names).size !== names.length) {
          throw new Error(`Duplicate labels during ownership read for issue #${number}`);
        }
        issues.push({
          number,
          state: issue.state === 'OPEN' ? 'open' : 'closed',
          labels: names,
          ...(issue.__typename === 'PullRequest' ? { pull_request: {} } : {}),
        });
      }
    }
    return issues;
  };

  return {
    getApiBudget,
    getIssues,
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
      (await github.rest.issues.createComment({ ...repository, issue_number: issue, body })).data
        .id,
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
  };
};
