/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * What the check concluded about a connector, worked out once from its report. The issue's title
 * and every section below read this, rather than each deriving its own view of the same findings;
 * it is also the one place that knows a report may predate the per-action findings.
 */

import type { ActionDrift, ConnectorDrift, SpecChange, StaleCorrection } from '../detect_drift';
import { reviewOfChange } from '../detect_drift';
import type { DriftProblem } from '../drift_problem';
import { otherProblem, problemTextOf } from '../drift_problem';
import { OVERLAY } from '../load_vendor_specs';
import { changeCategoryOf } from '../oasdiff_text';
import type { ActionStatus, FailureReason } from './action_status';
import { isChecked, statusOf } from './action_status';
import { code } from './issue_markdown';
import type { ReviewItem, ReviewKind } from './review_item';
import { REVIEW_LABELS } from './review_item';

export interface OtherProblemRow {
  readonly problem: string;
  readonly operation: string;
  readonly details: string;
  readonly fix: string;
}

/**
 * The problems that concern no single action, as table rows. The check reports each with its own
 * parts, so nothing is read back out of a sentence here; the invalid schemas of one operation are
 * the same problem under every auth type that hit them, so they share a row.
 */
export const otherProblemRows = (problems: readonly DriftProblem[]): OtherProblemRow[] => {
  const schemas = new Map<string, { operation: string; details: string; authTypes: string[] }>();
  const rows: OtherProblemRow[] = [];
  for (const problem of problems) {
    if (problem.kind === 'invalid-schema') {
      const { operation, location, message, authType } = problem;
      const key = `${operation} ${location} ${message}`;
      const entry = schemas.get(key) ?? {
        operation: code(operation),
        details: `${location}: ${message}`,
        authTypes: [],
      };
      if (!entry.authTypes.includes(authType)) {
        entry.authTypes.push(authType);
      }
      schemas.set(key, entry);
    } else if (problem.kind === 'undeclared-pagination') {
      rows.push({
        problem: 'Pagination not declared',
        operation: `${code(problem.operation)} (${code(problem.source)})`,
        details: `returns a collection, as ${problem.reason}`,
        fix: 'Declare its `pagination` in `manifest.json`, or `"none"`',
      });
    } else {
      rows.push({ problem: 'Other', operation: '—', details: problem.text, fix: '—' });
    }
  }
  return [
    ...[...schemas.values()].map(({ operation, details, authTypes }) => ({
      problem: 'Invalid schema in the spec',
      operation,
      details: `${details} (auth ${authTypes.length === 1 ? 'type' : 'types'} ${authTypes
        .map(code)
        .join(', ')})`,
      fix: `Correct the spec in \`${OVERLAY}\``,
    })),
    ...rows,
  ];
};

export interface Attention {
  /** Actions that need attention, with why. */
  readonly failing: ReadonlyArray<{ readonly action: string; readonly reason: FailureReason }>;
  /** Actions that read a response field that changed. */
  readonly readers: readonly string[];
  /** Per kind of change to review, the actions it affects. */
  readonly byKind: ReadonlyMap<ReviewKind, ReadonlySet<string>>;
  /**
   * Actions not checked, as the manifest records that no spec describes what they call. They need
   * attention in an issue opened for another reason, but don't open one themselves.
   */
  readonly notInSpec: readonly string[];
  /** Changes to review that affect no action, e.g. a removed shared schema. */
  readonly unattached: number;
  /** Every action that needs attention. */
  readonly actions: ReadonlySet<string>;
  /** The actions checked against the specs. */
  readonly total: number;
}

const attentionOf = (
  actions: readonly ActionDrift[],
  review: readonly ReviewItem[],
  failing: Attention['failing']
): Attention => {
  const readers = actions
    .filter(({ fieldChanges = [] }) => fieldChanges.length > 0)
    .map(({ action }) => action);
  const byKind = new Map<ReviewKind, Set<string>>();
  for (const item of review) {
    const named = byKind.get(item.kind) ?? new Set<string>();
    item.actions.forEach((action) => named.add(action));
    byKind.set(item.kind, named);
  }
  const notInSpec = actions
    .filter((action) => !isChecked(action) && action.unmatched.length > 0)
    .map(({ action }) => action);
  return {
    failing,
    readers,
    byKind,
    notInSpec,
    unattached: review.filter((item) => item.actions.length === 0).length,
    actions: new Set([
      ...failing.map(({ action }) => action),
      ...readers,
      ...[...byKind.values()].flatMap((named) => [...named]),
      ...notInSpec,
    ]),
    total: actions.filter(isChecked).length + notInSpec.length,
  };
};

/**
 * What the check concluded about a connector, worked out once from its report. The title and each
 * section of the body read this, rather than each deriving its own view of the same findings.
 */
export interface DriftConclusions {
  readonly actions: readonly ActionDrift[];
  /** Each action's status, by action name. */
  readonly statuses: ReadonlyMap<string, ActionStatus>;
  /** The spec changes that keep the issue open, with the actions that need to review them. */
  readonly review: readonly ReviewItem[];
  readonly attention: Attention;
  /** The actions that need attention, with why. */
  readonly failing: ReadonlyArray<ActionDrift & { readonly reason: FailureReason }>;
  readonly notChecked: readonly ActionDrift[];
  /** Where an action's path moved into the server URL, keeping the full URL. */
  readonly moved: ReadonlyArray<{ readonly source: string; readonly serverPath: string }>;
  /** The base paths that moved, named in the summary and the legend. */
  readonly serverPaths: readonly string[];
  /** Every action that needs attention only moved in the spec. */
  readonly movedOnly: boolean;
  /**
   * The overlay correction whose change to the servers explains every move, if one does: then the
   * moves are the check's own doing, and the connector is most likely fine.
   */
  readonly movesCausedBy?: number;
  readonly stale: readonly StaleCorrection[];
  // The problems outside the actions, read into rows once rather than per section that counts them.
  readonly snapshotProblems: readonly OtherProblemRow[];
  readonly latestProblems: readonly OtherProblemRow[];
  /** The rows the "Other problems" table lists. */
  readonly tabledProblems: readonly OtherProblemRow[];
  /** Changes to review that no action calls, as rows of the same table. */
  readonly unattachedProblems: readonly OtherProblemRow[];
}

export const conclusionsOf = (drift: ConnectorDrift): DriftConclusions => {
  const actions = drift.actions ?? [];

  const changesByOperation = new Map<string, SpecChange[]>();
  for (const [source, { changes = [] }] of Object.entries(drift.sources)) {
    for (const change of changes) {
      if (change.operation) {
        const key = `${source} ${change.operation}`;
        changesByOperation.set(key, [...(changesByOperation.get(key) ?? []), change]);
      }
    }
  }
  const changesOf = (source: string, operation: string) =>
    changesByOperation.get(`${source} ${operation}`) ?? [];

  const reviewersOf = reviewOfChange(drift);
  // A path the actions call that moved into the server URL is reported as removed by oasdiff.
  const movedOperations = new Set(
    actions.flatMap(({ operations }) =>
      operations.flatMap(({ source, operation, latest }) =>
        latest?.status === 'moved' ? [`${source} ${operation}`] : []
      )
    )
  );
  const kindOf = (source: string, change: SpecChange): ReviewKind => {
    const kind = changeCategoryOf(change.id);
    return kind === 'removed' && movedOperations.has(`${source} ${change.operation}`)
      ? 'moved-same-url'
      : kind;
  };
  const review: ReviewItem[] = Object.entries(drift.sources).flatMap(([source, { changes = [] }]) =>
    changes.flatMap((change) => {
      const { needsReview, actions: reviewers } = reviewersOf(source, change);
      return needsReview
        ? [{ kind: kindOf(source, change), source, change, actions: [...reviewers] }]
        : [];
    })
  );
  const reviewOf = (source: string, operation: string) =>
    review.filter((item) => item.source === source && item.change.operation === operation);

  const statuses = new Map(
    actions.map((action) => [action.action, statusOf(action, changesOf, reviewOf)])
  );
  // An action needs attention as soon as its status says why, which is what the summary groups
  // the failures by; counted once, for the title, the summary and the Result row.
  const failing = actions.flatMap((action) => {
    const reason = statuses.get(action.action)?.reason;
    return reason === undefined ? [] : [{ ...action, reason }];
  });

  const moved = actions.flatMap(({ operations }) =>
    operations.flatMap(({ source, latest }) =>
      latest?.status === 'moved' ? [{ source, serverPath: latest.serverPath }] : []
    )
  );
  const movedOnly = failing.length > 0 && failing.every(({ reason }) => reason === 'moved');

  // Reports written before the per-action findings list every problem outside the actions, as
  // text; they are read as problems with no parts of their own, so the sections below see one
  // shape whichever report they were given. Two problems are the same when they read the same.
  const unattributed = (
    drift.actions === undefined
      ? [...drift.snapshotProblems, ...(drift.latestProblems ?? [])].map(otherProblem)
      : [...(drift.otherProblems?.snapshot ?? []), ...(drift.otherProblems?.latest ?? [])]
  ).filter(
    (problem, index, all) =>
      all.findIndex((candidate) => problemTextOf(candidate) === problemTextOf(problem)) === index
  );

  return {
    actions,
    statuses,
    review,
    attention: attentionOf(actions, review, failing),
    failing,
    notChecked: actions.filter((action) => !isChecked(action)),
    moved,
    serverPaths: [...new Set(moved.map(({ serverPath }) => serverPath))],
    movedOnly,
    ...(movedOnly && drift.serversCorrection !== undefined
      ? { movesCausedBy: drift.serversCorrection }
      : {}),
    stale: drift.staleCorrections ?? [],
    snapshotProblems: otherProblemRows(drift.otherProblems?.snapshot ?? []),
    latestProblems: otherProblemRows(drift.otherProblems?.latest ?? []),
    tabledProblems: otherProblemRows(unattributed),
    unattachedProblems: review
      .filter((item) => item.actions.length === 0)
      .map(({ kind, change: { operation, text, id: rule } }) => ({
        problem: REVIEW_LABELS[kind],
        operation: operation ? code(operation) : '—',
        details: `${text} (${code(rule)})`,
        fix: 'Refresh the artifacts, unless the connector depends on it',
      })),
  };
};
