/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const REQUEST_LABEL = 'ai:fix-flaky';
export const FIXER_LABEL = 'flaky-test-fixer';
export const FIXER_WORKFLOW = 'flaky-test-fixer.lock.yml';
const RECEIPT = /<!-- flaky-fix-queue request:(\d+) run:(pending|\d+) -->/;
const RUN_TITLE = /^Flaky Test Fixer #(\d+) \((?:request (\d+)|manual)\)$/;

interface Label {
  name?: string;
}

export interface Issue {
  number: number;
  state: string;
  body?: string | null;
  labels: Array<string | Label>;
  pull_request?: object;
}

export interface LabelEvent {
  id: number;
  event: string;
  created_at: string | null;
  label?: Label;
  actor?: { login: string } | null;
}

export interface Comment {
  id: number;
  body?: string;
  created_at: string;
  user?: { login: string } | null;
}

export interface Run {
  id: number;
  display_title: string;
  status: string | null;
}

export interface FixRequest {
  issue: number;
  event: number;
  createdAt: string;
  requestedBy: string;
}

export interface QueueClient {
  listIssues: (label: string) => Promise<Issue[]>;
  getIssue: (number: number) => Promise<Issue>;
  listEvents: (number: number) => Promise<LabelEvent[]>;
  listComments: (number: number) => Promise<Comment[]>;
  listActiveRuns: () => Promise<Run[]>;
  getRun: (id: number) => Promise<Run>;
  createComment: (issue: number, body: string) => Promise<number>;
  updateComment: (id: number, body: string) => Promise<void>;
  dispatch: (request: FixRequest) => Promise<number>;
}

interface Snapshot {
  issue: Issue;
  teams: string[];
  request?: FixRequest;
  comments: Comment[];
}

export interface QueueOptions {
  client: QueueClient;
  log: (message: string) => void;
  dryRun?: boolean;
  maxOutstanding?: number;
  maxRunning?: number;
}

const labelName = (label: string | Label): string =>
  typeof label === 'string' ? label : label.name ?? '';

export const owningTeams = ({ labels }: Issue): string[] => {
  const teams = labels
    .map(labelName)
    .filter((name) => /^team\s*:/i.test(name) || name.startsWith(':'))
    .map((name) =>
      name
        .replace(/^team\s*:\s*/i, 'team:')
        .trim()
        .toLowerCase()
    );
  return teams.length ? [...new Set(teams)].sort() : ['unowned'];
};

export const linkedIssues = (body: string | null | undefined): number[] => [
  ...new Set(
    [
      ...(body ?? '').matchAll(
        /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:#|https:\/\/github\.com\/elastic\/kibana\/issues\/)(\d+)/gi
      ),
    ].map((match) => Number(match[1]))
  ),
];

export const latestRequest = (issue: Issue, events: LabelEvent[]): FixRequest | undefined => {
  if (!issue.labels.some((label) => labelName(label) === REQUEST_LABEL)) return;
  const event = events
    .filter(
      (entry) =>
        entry.label?.name === REQUEST_LABEL &&
        (entry.event === 'labeled' || entry.event === 'unlabeled')
    )
    .sort((left, right) => left.id - right.id)
    .at(-1);
  if (event?.event !== 'labeled' || !event.created_at || !event.actor?.login) return;
  return {
    issue: issue.number,
    event: event.id,
    createdAt: event.created_at,
    requestedBy: event.actor.login,
  };
};

const trustedComment = (comment: Comment): boolean =>
  ['github-actions[bot]', 'kibanamachine'].includes(comment.user?.login ?? '');

const receiptBody = (request: FixRequest, runId?: number): string =>
  [
    runId
      ? `AI fix requested: https://github.com/elastic/kibana/actions/runs/${runId}.`
      : "Starting an AI fix. A link to the run will appear here shortly. If it doesn't, check the [dispatcher runs](https://github.com/elastic/kibana/actions/workflows/flaky_fix_dispatcher.yml) before requesting another attempt.",
    `<!-- flaky-fix-queue request:${request.event} run:${runId ?? 'pending'} -->`,
  ].join('\n\n');

/** Admit labelled issues within each team's review budget; callers must serialize dispatcher runs. */
export const dispatchQueuedFixes = async ({
  client,
  log,
  dryRun = false,
  maxOutstanding = 5,
  maxRunning = 1,
}: QueueOptions): Promise<number[]> => {
  for (const value of [maxOutstanding, maxRunning]) {
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error('Queue limits must be positive integers');
  }

  const issues = new Map<number, Issue>();
  const getIssue = async (number: number): Promise<Issue> => {
    const cached = issues.get(number);
    if (cached) return cached;
    const issue = await client.getIssue(number);
    issues.set(number, issue);
    return issue;
  };
  const snapshots = new Map<number, Snapshot>();
  const getSnapshot = async (number: number): Promise<Snapshot> => {
    const cached = snapshots.get(number);
    if (cached) return cached;
    const issue = await getIssue(number);
    const [events, comments] = await Promise.all([
      client.listEvents(number),
      client.listComments(number),
    ]);
    const snapshot = {
      issue,
      teams: owningTeams(issue),
      request: latestRequest(issue, events),
      comments,
    };
    snapshots.set(number, snapshot);
    return snapshot;
  };

  // List endpoints avoid search indexing delays, search limits, and issue-age cutoffs.
  // Snapshot executions first: a run finishing during the PR read must not free a slot
  // before its new PR is visible. Holding it for one extra sweep is conservative.
  const activeRuns = await client.listActiveRuns();
  const [labelled, pullRequests] = await Promise.all([
    client.listIssues(REQUEST_LABEL),
    client.listIssues(FIXER_LABEL),
  ]);
  for (const issue of labelled) {
    if (!issue.pull_request) issues.set(issue.number, issue);
  }

  const outstanding = new Map<string, Set<string>>();
  const running = new Map<string, Set<number>>();
  const coveredIssues = new Set<number>();
  const activeIssues = new Set<number>();
  const charge = (teams: string[], key: string): void => {
    for (const team of teams) {
      const entries = outstanding.get(team) ?? new Set<string>();
      entries.add(key);
      outstanding.set(team, entries);
    }
  };
  for (const pr of pullRequests.filter((issue) => issue.pull_request)) {
    const numbers = linkedIssues(pr.body);
    const teams = new Set<string>();
    for (const number of numbers) {
      coveredIssues.add(number);
      for (const team of owningTeams(await getIssue(number))) teams.add(team);
    }
    charge(teams.size ? [...teams] : owningTeams(pr), `pr:${pr.number}`);
  }

  const chargeRun = (number: number, teams: string[]): void => {
    activeIssues.add(number);
    for (const team of teams) {
      const entries = running.get(team) ?? new Set<number>();
      entries.add(number);
      running.set(team, entries);
    }
    if (!coveredIssues.has(number)) charge(teams, `issue:${number}`);
  };
  for (const run of activeRuns) {
    const match = RUN_TITLE.exec(run.display_title);
    if (!match) {
      // Existing label-triggered runs have no issue in their title. Let them drain on rollout.
      log(`Deferring admission: active fixer run ${run.id} has no queue identity.`);
      return [];
    }
    const number = Number(match[1]);
    chargeRun(number, owningTeams(await getIssue(number)));
  }

  const hasCapacity = (teams: string[]): boolean =>
    teams.every(
      (team) =>
        (outstanding.get(team)?.size ?? 0) < maxOutstanding &&
        (running.get(team)?.size ?? 0) < maxRunning
    );
  const queue: Snapshot[] = [];
  for (const issue of labelled) {
    if (issue.pull_request) continue;
    // Skip history only when every owner is full; a receipt may reserve another owner's free slot.
    if (!owningTeams(issue).some((team) => hasCapacity([team]))) {
      log(`Deferred #${issue.number}: owning team has no capacity.`);
      continue;
    }
    queue.push(await getSnapshot(issue.number));
  }

  const attempted = new Set<number>();
  for (const snapshot of queue) {
    const { request, comments, teams } = snapshot;
    if (!request) continue;
    const receipts = comments.filter(trustedComment).filter((comment) => {
      const match = RECEIPT.exec(comment.body ?? '');
      return match && Number(match[1]) === request.event;
    });
    if (!receipts.length) {
      // Do not retry failed requests from the old, directly label-triggered workflow.
      if (
        comments.some(
          (comment) =>
            trustedComment(comment) &&
            comment.created_at >= request.createdAt &&
            /workflow_id: flaky-test-fixer\b/.test(comment.body ?? '')
        )
      ) {
        attempted.add(request.issue);
      }
      continue;
    }

    attempted.add(request.issue);
    for (const receipt of receipts) {
      const match = RECEIPT.exec(receipt.body ?? '');
      const runId = match?.[2];
      if (runId === 'pending') {
        // Persist before dispatch: an interrupted/ambiguous POST must never be retried blindly.
        chargeRun(request.issue, teams);
        log(`Issue #${request.issue} has an unresolved admission; inspect its dispatcher run.`);
      } else if (runId && (await client.getRun(Number(runId))).status !== 'completed') {
        chargeRun(request.issue, teams);
      }
    }
  }

  queue.sort(
    (left, right) =>
      (left.request?.createdAt ?? '').localeCompare(right.request?.createdAt ?? '') ||
      (left.request?.event ?? 0) - (right.request?.event ?? 0)
  );
  const admitted: number[] = [];
  for (const snapshot of queue) {
    const { request, teams, issue } = snapshot;
    if (
      !request ||
      issue.state !== 'open' ||
      attempted.has(issue.number) ||
      activeIssues.has(issue.number) ||
      coveredIssues.has(issue.number)
    ) {
      continue;
    }
    if (!hasCapacity(teams)) {
      log(`Deferred #${issue.number}: ${teams.join(', ')} has no capacity.`);
      continue;
    }

    // Recheck cancellation, re-labelling, and ownership changes immediately before admission.
    const currentIssue = await client.getIssue(issue.number);
    const currentRequest = latestRequest(currentIssue, await client.listEvents(issue.number));
    if (
      currentIssue.state !== 'open' ||
      currentRequest?.event !== request.event ||
      owningTeams(currentIssue).join(',') !== teams.join(',')
    ) {
      log(`Deferred #${issue.number}: request changed during the sweep.`);
      continue;
    }

    chargeRun(issue.number, teams);
    admitted.push(issue.number);
    log(`${dryRun ? 'Would dispatch' : 'Dispatching'} #${issue.number} (${teams.join(', ')}).`);
    if (dryRun) continue;

    const commentId = await client.createComment(issue.number, receiptBody(request));
    const runId = await client.dispatch(request);
    if (!Number.isSafeInteger(runId) || runId < 1) {
      throw new Error(
        `Dispatch for #${issue.number} returned no run ID; inspect the admission receipt.`
      );
    }
    // Direct read verifies the execution independently of the workflow-runs list.
    const run = await client.getRun(runId);
    const identity = RUN_TITLE.exec(run.display_title);
    if (Number(identity?.[1]) !== issue.number || Number(identity?.[2]) !== request.event) {
      throw new Error(`Unexpected identity for dispatched run ${runId}.`);
    }
    await client.updateComment(commentId, receiptBody(request, runId));
  }

  return admitted;
};
