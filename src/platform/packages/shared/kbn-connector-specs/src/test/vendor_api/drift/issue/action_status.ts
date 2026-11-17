/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * What an action's row of a drift issue says: whether it passes, why it doesn't, and the details
 * behind that. One action is judged on its own, against the committed snapshot and the latest
 * spec, so this is where the check's findings for it become a verdict.
 */

import type { ActionDrift, SpecChange } from '../detect_drift';
import { usesCoordinate } from '../graphql_drift';
import { isRequestChange, isResponseChange } from '../oasdiff_text';
import { capitalized, code, listed, plural } from './issue_markdown';
import { firstProblem, issueLinksOf, problemText } from './problem_text';
import type { ReviewItem } from './review_item';

/** How an action sorts in the table: what needs attention first, then what doesn't. */
export type Rank = 'fails' | 'attention' | 'passes' | 'not-checked';

/** The Status column. */
export type Outcome = 'passes' | 'fails' | 'not-checked';

/**
 * Why an action needs attention. An action has one as soon as the check can't call it passing, so
 * `reason` is also what tells the actions that need attention from the rest.
 */
export type FailureReason = 'credentials' | 'latest' | 'snapshot' | 'removed' | 'moved';

export interface ActionStatus {
  readonly rank: Rank;
  /** Why it needs attention, if it does; what the summary groups the failing actions by. */
  readonly reason?: FailureReason;
  /** The Status column. */
  readonly outcome: Outcome;
  /** The Details column. */
  readonly details: string;
}

export const OUTCOMES: Record<Outcome, string> = {
  passes: '✅ Passes',
  fails: '❌ Fails',
  'not-checked': '➖ Not checked',
};

/** Every action of the report has a status; this stands in if one is ever missing. */
export const PASSES: ActionStatus = { rank: 'passes', outcome: 'passes', details: '' };

export const RANKS: readonly Rank[] = ['fails', 'attention', 'passes', 'not-checked'];

export const ICONS: Record<Rank, string> = {
  fails: '❌',
  attention: '⚠️',
  passes: '✅',
  'not-checked': '➖',
};

/** How the legend and an action's details name a path that moved into the server URL. */
export const MOVED_STATUS = 'Moved in the spec, same URL';

const UNMATCHED_PROBLEM = / matches no operation of any source/;

// The one violation a request with credentials the operation doesn't accept has.
const MISSING_CREDENTIALS =
  /breaks the spec: Request has no credentials for the operation; expected ([^;]+)$/;

// The changes to review a passing action's Details names, at most.
const MAX_REVIEW_DETAILS = 3;

export const isChecked = ({ operations, latestProblems = [] }: ActionDrift): boolean =>
  operations.length > 0 || latestProblems.length > 0;

export const statusOf = (
  action: ActionDrift,
  changesOf: (source: string, operation: string) => readonly SpecChange[],
  reviewOf: (source: string, operation: string) => readonly ReviewItem[]
): ActionStatus => {
  if (action.snapshotProblems.length > 0) {
    const problem = firstProblem(action.snapshotProblems);
    return {
      rank: 'fails',
      reason: 'snapshot',
      outcome: 'fails',
      details: `Against the committed snapshot: ${problem}`,
    };
  }
  if (action.latestProblems === undefined && isChecked(action)) {
    return {
      rank: 'attention',
      outcome: 'not-checked',
      details: "The latest spec didn't load; passes against the committed snapshot",
    };
  }
  const latestProblems = action.latestProblems ?? [];
  if (latestProblems.length > 0) {
    const locations = action.operations.map(({ latest }) => latest?.status);
    const unmatchedOnly = latestProblems.every((problem) => UNMATCHED_PROBLEM.test(problem));
    if (unmatchedOnly && locations.includes('moved') && !locations.includes('missing')) {
      return {
        rank: 'attention',
        reason: 'moved',
        // Its request goes where it did, but the check can't match it to the latest spec.
        outcome: 'not-checked',
        details: `${ICONS.attention} ${MOVED_STATUS}, so it isn't checked against the latest spec (see below)`,
      };
    }
    if (unmatchedOnly && locations.includes('missing')) {
      const missing = action.operations.filter(({ latest }) => latest?.status === 'missing');
      const details = `Removed from current spec: ${listed(
        missing.map(({ operation }) => code(operation))
      )}`;
      return { rank: 'fails', reason: 'removed', outcome: 'fails', details };
    }
    // Credentials the latest spec doesn't accept, and nothing else: often a spec that started
    // documenting OAuth scopes per operation, rather than a vendor that stopped taking the others.
    const expected = latestProblems.flatMap((problem) => {
      const credentials = problem.match(MISSING_CREDENTIALS)?.[1];
      return credentials === undefined ? [] : [credentials];
    });
    if (expected.length === latestProblems.length) {
      const authChanges = action.operations.flatMap(({ source, operation }) =>
        changesOf(source, operation).filter(({ id }) => id.startsWith('api-security-'))
      );
      return {
        rank: 'fails',
        reason: 'credentials',
        outcome: 'fails',
        details: `The latest spec requires credentials the connector doesn't send: ${problemText(
          `expected ${listed([...new Set(expected)])}`
        )}.${authChanges.length > 0 ? ` Spec change: ${authChanges[0].text}.` : ''}`,
      };
    }
    const problem = firstProblem(latestProblems);
    return {
      rank: 'fails',
      reason: 'latest',
      outcome: 'fails',
      details: `Against the latest spec: ${problem}`,
    };
  }
  if (!isChecked(action) && action.unmatched.length > 0) {
    // Missing when the connector was recorded, as the manifest acknowledges with a reason; a
    // new unmatched request is a problem of the run instead.
    const issues = [...new Set(action.unmatched.flatMap(({ reason }) => issueLinksOf(reason)))];
    return {
      rank: 'not-checked',
      outcome: 'not-checked',
      details: `No spec describes the endpoint (${[...issues, 'see below'].join(', ')})`,
    };
  }
  if (!isChecked(action)) {
    return {
      rank: 'not-checked',
      outcome: 'not-checked',
      details: 'Calls no vendor operation',
    };
  }
  const passes = (rank: Rank, details: string): ActionStatus => ({
    rank,
    outcome: 'passes',
    details,
  });
  const fieldChanges = action.fieldChanges ?? [];
  if (fieldChanges.length > 0) {
    return passes(
      'attention',
      `${ICONS.attention} Vendor response has changed, including fields Connector reads: ${listed(
        fieldChanges.map(({ field, changes: what }) => `${code(field)} (${what.join(', ')})`)
      )}`
    );
  }
  const changes = action.operations.flatMap(({ source, operation }) =>
    changesOf(source, operation).map((change) => ({ source, operation, change }))
  );
  const notable = changes.filter(({ change }) => change.kind !== 'non-breaking');
  const responses = notable.filter(({ change }) => isResponseChange(change.id));
  // A GraphQL response has only the fields the query selects, so the changed ones it passes
  // along are named.
  const graphqlResponses = responses.filter(({ change }) => change.coordinate !== undefined);
  const passedChangedOf = (except: ReadonlySet<string>) => [
    ...new Set(
      graphqlResponses.flatMap(({ source, operation, change }) => {
        const use = action.graphqlUse?.[`${source} ${operation}`];
        return use &&
          change.coordinate &&
          !except.has(change.coordinate) &&
          usesCoordinate(use, change)
          ? [change.coordinate]
          : [];
      })
    ),
  ];
  const passingAlong = (coordinates: readonly string[]) =>
    `Vendor response has changed, and Connector is passing along changed fields: ${listed(
      coordinates.map(code)
    )}`;

  // The action works, but what it calls needs a look, as the summary counts it: oasdiff's own
  // description of each change says what.
  const reviewed = action.operations.flatMap(({ source, operation }) =>
    reviewOf(source, operation)
  );
  const toReview = [...new Set(reviewed.map(({ change: { text } }) => capitalized(text)))];
  if (toReview.length > 0) {
    const shown = toReview.slice(0, MAX_REVIEW_DETAILS);
    const alsoPassed = passedChangedOf(
      new Set(reviewed.flatMap(({ change: { coordinate } }) => (coordinate ? [coordinate] : [])))
    );
    return passes(
      'passes',
      `${ICONS.attention} ${shown.join('; ')}${
        toReview.length > shown.length
          ? ` (and ${plural(toReview.length - shown.length, 'more change')})`
          : ''
      }${alsoPassed.length > 0 ? `. ${passingAlong(alsoPassed)}.` : ''}`
    );
  }
  if (notable.length > 0 && action.tracked) {
    // Its operations changed in ways running it and its field use verify.
    const passedChanged = passedChangedOf(new Set());
    const passedAlong = responses.flatMap(({ source, operation }) => {
      const { copied = [], returned = [] } = action.fieldUse?.[`${source} ${operation}`] ?? {};
      return [...copied, ...returned];
    });
    const sentences = [
      ...(notable.some(({ change }) => isRequestChange(change.id))
        ? ["Vendor request has changed, and Connector's requests still match it"]
        : []),
      ...(responses.length === 0
        ? []
        : graphqlResponses.length === responses.length
        ? [
            passedChanged.length > 0
              ? passingAlong(passedChanged)
              : 'Vendor response has changed, but Connector is not using changed fields',
          ]
        : passedAlong.includes('')
        ? [
            'Vendor response has changed, and Connector is passing along the entire changed response',
          ]
        : passedAlong.length > 0
        ? ['Vendor response has changed, and Connector is passing along parts of it as they are']
        : ['Vendor response has changed, but Connector is not using changed fields']),
    ];
    return passes(
      'passes',
      sentences.length > 0 ? `${sentences.join('. ')}.` : 'Vendor spec has changed'
    );
  }
  return passes('passes', changes.length > 0 ? plural(changes.length, 'non-breaking change') : '');
};
