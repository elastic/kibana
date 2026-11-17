/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorDrift, DriftReportEntry, FailedDrift } from './detect_drift';
import { connectorOf, DRIFT_ISSUE_LABEL, markerOf } from './drift_issue_marker';
import { changeList, findingsOf, renderDriftIssue } from './drift_issue';
import type { VendorApiLog } from './update_vendor_api';
import { errorMessage } from './values';

export interface DriftIssue {
  readonly number: number;
  readonly state: 'open' | 'closed';
  readonly title: string;
  readonly body: string;
  readonly url: string;
}

/** The GitHub calls surfacing needs, against one repository. */
export interface IssueTracker {
  /** Every issue labelled `connector-validation`, open or closed. */
  readonly list: () => Promise<DriftIssue[]>;
  readonly create: (issue: {
    title: string;
    body: string;
    labels: readonly string[];
  }) => Promise<DriftIssue>;
  readonly update: (
    number: number,
    changes: { title?: string; body?: string; state?: 'open' | 'closed' }
  ) => Promise<void>;
  readonly comment: (number: number, body: string) => Promise<void>;
}

export type SurfaceActionKind =
  | 'created'
  | 'updated'
  | 'reopened'
  | 'closed'
  | 'unchanged'
  | 'refresh'
  | 'none'
  | 'failed';

export interface SurfaceAction {
  readonly connector: string;
  readonly action: SurfaceActionKind;
  readonly issue?: { readonly number: number; readonly url: string };
  readonly error?: string;
}

export interface DriftSummary {
  readonly repo: string;
  readonly dryRun: boolean;
  readonly actions: readonly SurfaceAction[];
  /** Connectors whose artifacts a refresh PR should update. */
  readonly refresh: readonly string[];
  readonly refreshPrBody: string;
}

export interface SurfaceDriftOptions {
  readonly report: readonly DriftReportEntry[];
  readonly tracker: IssueTracker;
  readonly repo: string;
  /** Reads the issues, but logs what it would write instead of writing it. */
  readonly dryRun: boolean;
  /** The teams owning a connector's folder, without the `@`, mentioned in its issue. */
  readonly ownersOf: (connector: string) => readonly string[];
  /** The connectors with vendor API artifacts; open issues of any other are closed. */
  readonly knownConnectors: ReadonlySet<string>;
  /** The build that ran the check, linked from comments. */
  readonly buildUrl?: string;
  readonly log: VendorApiLog;
}

const isFailed = (entry: DriftReportEntry): entry is FailedDrift => 'error' in entry;

/** The body of the bot PR refreshing the artifacts of connectors with non-breaking drift. */
export const renderRefreshPr = (drifts: readonly ConnectorDrift[]): string =>
  [
    'Refreshes the `vendor_api` artifacts of connectors whose vendor specs changed without breaking them, as found by the weekly vendor API drift check (`node scripts/connector_vendor_api --drift`). The actions pass against the latest specs.',
    '',
    ...drifts.flatMap((drift) => {
      const changes = Object.entries(drift.sources).flatMap(([name, source]) =>
        (source.changes ?? []).map((change) => ({ ...change, text: `${name}: ${change.text}` }))
      );
      return [
        `### \`${drift.connector}\``,
        '',
        ...(drift.operationsChanged ? ['- The actions call other operations.'] : []),
        ...changeList(changes),
        ...(changes.length === 0 && !drift.operationsChanged
          ? ['- The specs changed outside what `oasdiff` reports.']
          : []),
        '',
      ];
    }),
  ].join('\n');

/**
 * Turns a drift report into GitHub issues: one per connector that needs one, found again by the
 * marker in its body, updated or reopened when the findings change, and closed once the
 * connector no longer needs one or is gone. Connectors that only need a refresh are listed for
 * the refresh PR.
 */
export const surfaceDrift = async ({
  report,
  tracker,
  repo,
  dryRun,
  ownersOf,
  knownConnectors,
  buildUrl,
  log,
}: SurfaceDriftOptions): Promise<DriftSummary> => {
  const issues = await tracker.list();
  const build = buildUrl ? ` in ${buildUrl}` : '';
  // Logs the write in a dry run instead of making it.
  const write = async (description: string, call: () => Promise<unknown>) => {
    log.info(`${dryRun ? 'Would ' : ''}${description}`);
    if (!dryRun) {
      await call();
    }
  };

  const actions: SurfaceAction[] = [];
  const refreshed: ConnectorDrift[] = [];
  for (const entry of report) {
    if (isFailed(entry)) {
      actions.push({ connector: entry.connector, action: 'failed', error: entry.error });
      continue;
    }
    const { connector, outcome } = entry;
    // The open one first, then the latest.
    const [existing] = issues
      .filter(({ body }) => body.includes(markerOf(connector)))
      .sort(
        (a, b) => Number(a.state === 'closed') - Number(b.state === 'closed') || b.number - a.number
      );
    try {
      if (outcome !== 'issue') {
        if (outcome === 'refresh') {
          refreshed.push(entry);
        }
        if (existing?.state === 'open') {
          const finding =
            outcome === 'refresh'
              ? `only changes for \`${connector}\` that the refresh PR picks up`
              : `\`${connector}\` healthy`;
          await write(`close #${existing.number} (found ${finding})`, async () => {
            await tracker.comment(
              existing.number,
              `The drift check found ${finding}${build}; closing.`
            );
            await tracker.update(existing.number, { state: 'closed' });
          });
          actions.push({ connector, action: 'closed', issue: existing });
        } else {
          actions.push({ connector, action: outcome });
        }
        continue;
      }

      const { title, body } = renderDriftIssue(entry, { owners: ownersOf(connector), buildUrl });
      if (!existing) {
        let created: DriftIssue | undefined;
        await write(`create an issue for ${connector}: ${title}`, async () => {
          created = await tracker.create({ title, body, labels: [DRIFT_ISSUE_LABEL] });
        });
        actions.push({ connector, action: 'created', ...(created ? { issue: created } : {}) });
      } else if (existing.state === 'closed') {
        await write(`reopen #${existing.number} for ${connector}`, async () => {
          await tracker.update(existing.number, { title, body, state: 'open' });
          await tracker.comment(
            existing.number,
            `The drift check found \`${connector}\` drifting again${build}; reopening.`
          );
        });
        actions.push({ connector, action: 'reopened', issue: existing });
      } else if (findingsOf(existing.body) !== findingsOf(body) || existing.title !== title) {
        await write(`update #${existing.number} for ${connector}`, async () => {
          await tracker.update(existing.number, { title, body });
          await tracker.comment(
            existing.number,
            `The drift check found new findings for \`${connector}\`${build}; the description is updated.`
          );
        });
        actions.push({ connector, action: 'updated', issue: existing });
      } else {
        // Only when it was last checked changed: editing the body notifies no one.
        if (existing.body.trim() !== body.trim()) {
          await write(`refresh when #${existing.number} was last checked`, () =>
            tracker.update(existing.number, { body })
          );
        }
        actions.push({ connector, action: 'unchanged', issue: existing });
      }
    } catch (error) {
      log.warning(`${connector}: ${errorMessage(error)}`);
      actions.push({ connector, action: 'failed', error: errorMessage(error) });
    }
  }

  // A removed connector is in no report, so nothing above would ever close its issue.
  for (const issue of issues) {
    const connector = connectorOf(issue.body);
    if (issue.state !== 'open' || connector === undefined || knownConnectors.has(connector)) {
      continue;
    }
    try {
      await write(`close #${issue.number} (${connector} no longer exists)`, async () => {
        await tracker.comment(
          issue.number,
          `The drift check no longer covers \`${connector}\`${build}; closing.`
        );
        await tracker.update(issue.number, { state: 'closed' });
      });
      actions.push({ connector, action: 'closed', issue });
    } catch (error) {
      log.warning(`${connector}: ${errorMessage(error)}`);
      actions.push({ connector, action: 'failed', error: errorMessage(error) });
    }
  }

  return {
    repo,
    dryRun,
    actions,
    refresh: refreshed.map(({ connector }) => connector),
    refreshPrBody: renderRefreshPr(refreshed),
  };
};
