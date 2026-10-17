/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestReport } from '@kbn/scout-reporting';
import { getTeamByGithubHandle } from '@kbn/code-owners';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  hasIssueLabel,
  type GithubApi,
  type GithubFixPullRequest,
  type GithubIssue,
  type GithubIssueEvent,
} from '../failed_tests_reporter/github_api';
import { describeIssue } from '../flaky_test_issues/match_issues';
import { associateIssue, buildFixGroups, isTestFilePath, type FixGroup } from './groups';
import {
  FIX_LABEL,
  FIXABLE_LABEL,
  episodeStart,
  isFixAttempt,
  labeledFixableAfter,
  latestReopen,
  openPeriods,
  type IssueHistory,
} from './history';

const OPTED_OUT_TEAM = 'Team:Kibana Management';
/** Verdicts that rule out an automatic fix even when the issue is also labeled AI-fixable. */
const BLOCKING_LABELS = [
  'failure:inconclusive',
  'failure:insufficient-data',
  'failure:test-needs-migration',
];
/** The only account that requests fixes automatically. */
const AUTHOR = 'kibanamachine';

type SelectorGithub = Pick<
  GithubApi,
  | 'listIssues'
  | 'getAuthenticatedLogin'
  | 'getIssue'
  | 'getIssueTimeline'
  | 'getIssueFixPullRequests'
  | 'checkLabel'
  | 'addLabelsOnce'
>;

/** Why a group gets no request this run. */
type HoldReason =
  | 'unknown-or-moved-file'
  | 'no-active-main-failure'
  | 'team-opted-out'
  | 'no-open-issue'
  | `ambiguous-identity: ${string}`
  | 'request-in-flight'
  | 'existing-fix-pr'
  | 'awaiting-investigation'
  | 'already-requested'
  | 'already-fixed'
  | 'representative-not-eligible'
  | 'awaiting-fresh-investigation'
  | 'request-budget'
  | 'changed-during-selection';

export interface FixAction {
  filePath: string;
  framework: string;
  issue?: number;
  siblings: number[];
  action: 'requested' | 'would-request' | 'held' | 'failed';
  /** A hold reason, `eligible`, or the error that failed the group. */
  reason: string;
}

export interface FixSummary {
  githubRepo: string;
  dryRun: boolean;
  reportGeneratedAt: Date;
  buildUrl: string;
  outsideReport: number[];
  actions: FixAction[];
}

interface Options {
  github: SelectorGithub;
  report: FlakyTestReport;
  repo: string;
  dryRun: boolean;
  maxRequests: number;
  buildUrl: string;
  fileExists: (path: string) => boolean;
  log: ToolingLog;
}

/**
 * The stretch, up to now, during which at least one of the file's issues has been open, and the
 * issues open during it. Requests and fixes from before it belong to an earlier episode.
 */
interface Episode {
  start: string;
  members: IssueHistory[];
}

interface Fix {
  member: IssueHistory;
  pr: GithubFixPullRequest;
}

/** Why a group is held, with the issue representing the file once one is known. */
interface Hold {
  hold: HoldReason;
  representative?: IssueHistory;
}

/** A representative to request a fix for, and what that decision relied on. */
interface Request {
  representative: IssueHistory;
  reopen?: GithubIssueEvent;
  episode: Episode;
}

/** Requests left this run. A failed write spends one too: it may have dispatched a fix. */
interface Budget {
  remaining: number;
}

const isEligible = (issue: GithubIssue): boolean =>
  issue.state === 'open' &&
  hasIssueLabel(issue, 'failed-test') &&
  hasIssueLabel(issue, FIXABLE_LABEL) &&
  !BLOCKING_LABELS.some((label) => hasIssueLabel(issue, label));

// Reads, one request at a time, so a file with a long history stays clear of GitHub's
// secondary rate limits

/** Every open issue, and each closed one that was still open once the episode began. */
const readEpisode = async (
  github: SelectorGithub,
  siblings: GithubIssue[]
): Promise<Episode | undefined> => {
  const members: IssueHistory[] = [];
  const isMember = (issue: GithubIssue) =>
    members.some((member) => member.issue.number === issue.number);
  let start: string | undefined;
  let pending = siblings.filter((issue) => issue.state === 'open');
  // A closed issue can move the start back, which can bring in older closed issues
  while (pending.length) {
    for (const issue of pending) {
      members.push({ issue, events: await github.getIssueTimeline(issue.number) });
    }
    const since = episodeStart(members.flatMap(openPeriods));
    start = since;
    pending = siblings.filter(
      (issue) =>
        since !== undefined &&
        !isMember(issue) &&
        issue.closed_at !== null &&
        issue.closed_at >= since
    );
  }
  return start === undefined ? undefined : { start, members };
};

const readFixes = async (github: SelectorGithub, members: IssueHistory[]): Promise<Fix[]> => {
  const fixes: Fix[] = [];
  for (const member of members) {
    for (const pr of await github.getIssueFixPullRequests(member.issue.number)) {
      fixes.push({ member, pr });
    }
  }
  return fixes;
};

const readIssues = async (github: SelectorGithub, issues: GithubIssue[]) => {
  const fresh: GithubIssue[] = [];
  for (const { number } of issues) {
    fresh.push(await github.getIssue(number));
  }
  return fresh;
};

// Policy, on what was read

const hasActiveMainFailure = (group: FixGroup): boolean =>
  group.suites.some(({ tests }) =>
    tests.some((test) =>
      test.byBranch.some((b) => b.branch === 'main' && b.failedBuilds > 0 && !b.skipped)
    )
  );

const ownedByOptedOutTeam = (group: FixGroup): boolean =>
  group.suites.some(({ tests }) =>
    tests.some((test) =>
      test.owners.some((owner) => getTeamByGithubHandle(owner)?.github.label === OPTED_OUT_TEAM)
    )
  );

/** Holds that come from the episode's issues themselves rather than from their history. */
const episodeHold = (group: FixGroup, { start, members }: Episode): HoldReason | undefined => {
  // An issue we cannot place only matters if it could belong to the current episode
  const ambiguous = group.ambiguous.filter(
    (issue) => issue.state === 'open' || (issue.closed_at !== null && issue.closed_at >= start)
  );
  if (ambiguous.length) {
    return `ambiguous-identity: ${ambiguous.map(({ number }) => number).join(', ')}`;
  }
  if (members.some(({ issue }) => hasIssueLabel(issue, OPTED_OUT_TEAM))) return 'team-opted-out';
  if (members.some(({ issue }) => hasIssueLabel(issue, FIX_LABEL))) return 'request-in-flight';
  return undefined;
};

interface Dated {
  member: IssueHistory;
  at: string;
}

const byTime = (a: Dated, b: Dated): number =>
  a.at.localeCompare(b.at) || a.member.issue.number - b.member.issue.number;

const attemptsSince = (members: IssueHistory[], start: string): Dated[] =>
  members
    .flatMap((member) =>
      member.events
        .filter((event) => isFixAttempt(event) && event.created_at >= start)
        .map((event) => ({ member, at: event.created_at }))
    )
    .sort(byTime);

const mergesSince = (fixes: Fix[], start: string): Dated[] =>
  fixes
    .flatMap(({ member, pr: { state, mergedAt } }) =>
      state === 'MERGED' && mergedAt && mergedAt >= start ? [{ member, at: mergedAt }] : []
    )
    .sort(byTime);

/**
 * The episode's earliest request, else its earliest merged fix, else the best eligible target
 * represents the file, so a finished attempt does not rotate to a sibling. Only the
 * representative's reopen allows another attempt, and only after a fresh investigation.
 */
const decide = (group: FixGroup, episode: Episode, fixes: Fix[]): Hold | Request => {
  const attempts = attemptsSince(episode.members, episode.start);
  const merges = mergesSince(fixes, episode.start);
  const representative =
    attempts[0]?.member ??
    merges[0]?.member ??
    group.targets
      .map((target) => episode.members.find(({ issue }) => issue.number === target.number))
      .find((member): member is IssueHistory => member !== undefined && isEligible(member.issue));
  if (!representative) return { hold: 'awaiting-investigation' };

  const reopen = latestReopen(representative.events);
  const sinceReopen = ({ at }: Dated) => !reopen || at >= reopen.created_at;
  const hold = (reason: HoldReason): Hold => ({ hold: reason, representative });
  if (attempts.some(sinceReopen)) return hold('already-requested');
  if (merges.some(sinceReopen)) return hold('already-fixed');
  if (!isEligible(representative.issue)) return hold('representative-not-eligible');
  if (reopen && !labeledFixableAfter(representative.events, reopen)) {
    return hold('awaiting-fresh-investigation');
  }
  return { representative, reopen, episode };
};

/** Whether fresh reads differ in anything the request relied on, e.g. a manual request since. */
const changedSince = (group: FixGroup, request: Request, fresh: Episode | undefined): boolean => {
  const { representative, reopen, episode } = request;
  const current = fresh?.members.find(({ issue }) => issue.number === representative.issue.number);
  if (!fresh || !current) return true;
  const association = associateIssue(group, describeIssue(current.issue));
  const seen = (number: number, event: GithubIssueEvent) =>
    episode.members
      .find(({ issue }) => issue.number === number)
      ?.events.some(({ id }) => id === event.id) === true;
  return (
    fresh.start !== episode.start ||
    !isEligible(current.issue) ||
    (association !== 'target' && association !== 'sibling') ||
    latestReopen(current.events)?.id !== reopen?.id ||
    fresh.members.some(
      ({ issue, events }) =>
        hasIssueLabel(issue, FIX_LABEL) ||
        hasIssueLabel(issue, OPTED_OUT_TEAM) ||
        events.some(
          (event) =>
            isFixAttempt(event) && event.created_at >= episode.start && !seen(issue.number, event)
        )
    )
  );
};

// Steps of a run

/** Reads what one file group needs, cheapest checks first, and decides on it. */
const selectGroup = async (
  { github, fileExists }: Options,
  group: FixGroup
): Promise<Hold | Request> => {
  if (!isTestFilePath(group.filePath) || !fileExists(group.filePath)) {
    return { hold: 'unknown-or-moved-file' };
  }
  if (!hasActiveMainFailure(group)) return { hold: 'no-active-main-failure' };
  if (ownedByOptedOutTeam(group)) return { hold: 'team-opted-out' };

  const episode = await readEpisode(github, group.siblings);
  if (!episode) return { hold: 'no-open-issue' };
  const hold = episodeHold(group, episode);
  if (hold) return { hold };

  const fixes = await readFixes(github, episode.members);
  if (fixes.some(({ pr }) => pr.state === 'OPEN')) return { hold: 'existing-fix-pr' };
  return decide(group, episode, fixes);
};

/** Rereads the group: a manual request, a reopen or a close may have arrived meanwhile. */
const changedDuringSelection = async (
  github: SelectorGithub,
  group: FixGroup,
  request: Request
): Promise<boolean> => {
  const fresh = await readEpisode(github, await readIssues(github, group.siblings));
  return changedSince(group, request, fresh);
};

/** Spends the budget on the request and applies the trigger label, unless in dry run. */
const requestFix = async (
  { github, dryRun }: Options,
  group: FixGroup,
  request: Request,
  budget: Budget
): Promise<Pick<FixAction, 'action' | 'reason'>> => {
  const held = (reason: HoldReason) => ({ action: 'held' as const, reason });
  if (budget.remaining <= 0) return held('request-budget');
  if (await changedDuringSelection(github, group, request)) {
    return held('changed-during-selection');
  }
  budget.remaining -= 1;
  if (!dryRun) await github.addLabelsOnce(request.representative.issue.number, [FIX_LABEL]);
  return { action: dryRun ? 'would-request' : 'requested', reason: 'eligible' };
};

/** Decides on one group and requests its fix if eligible; a failure is recorded, not thrown. */
const settleGroup = async (
  options: Options,
  group: FixGroup,
  budget: Budget
): Promise<FixAction> => {
  const { log } = options;
  const action: FixAction = {
    filePath: group.filePath,
    framework: group.framework,
    siblings: group.siblings.map(({ number }) => number),
    action: 'held',
    reason: '',
  };
  try {
    const decision = await selectGroup(options, group);
    action.issue = decision.representative?.issue.number;
    if ('hold' in decision) {
      action.reason = decision.hold;
    } else {
      Object.assign(action, await requestFix(options, group, decision, budget));
    }
  } catch (error) {
    action.action = 'failed';
    action.reason = error instanceof Error ? error.message : String(error);
    log.error(`Flaky fix selection failed for ${group.filePath}: ${action.reason}`);
  }
  log.info(`${action.action}: ${group.filePath}: ${action.reason}`);
  return action;
};

/** Live requests are written by the automation account and need the trigger label to exist. */
const verifyLiveAccess = async (github: SelectorGithub): Promise<void> => {
  if ((await github.getAuthenticatedLogin()) !== AUTHOR) {
    throw new Error(`Live requests must be authored by ${AUTHOR}`);
  }
  await github.checkLabel(FIX_LABEL);
};

/** Eligible issues that belong to no report group, so the selector never requests them. */
const outsideReport = (issues: GithubIssue[], groups: FixGroup[]): number[] => {
  const associated = new Set(
    groups.flatMap((group) => [...group.siblings, ...group.ambiguous].map(({ number }) => number))
  );
  return issues
    .filter((issue) => isEligible(issue) && !associated.has(issue.number))
    .map(({ number }) => number);
};

/** Select one automatic fix per file and representative open episode using existing GitHub history. */
export const requestFlakyTestFixes = async (options: Options): Promise<FixSummary> => {
  const { github, report, repo, dryRun, maxRequests, buildUrl, log } = options;
  log.info(`Loading open and closed failed-test issues in ${repo}`);
  const issues = await github.listIssues({ state: 'all', labels: ['failed-test'] });
  log.info(`Loaded ${issues.length} failed-test issues`);
  if (!dryRun) await verifyLiveAccess(github);

  const groups = buildFixGroups(report, issues);
  const budget: Budget = { remaining: maxRequests };
  const actions: FixAction[] = [];
  for (const group of groups) {
    actions.push(await settleGroup(options, group, budget));
  }
  return {
    githubRepo: repo,
    dryRun,
    reportGeneratedAt: report.generatedAt,
    buildUrl,
    outsideReport: outsideReport(issues, groups),
    actions,
  };
};
