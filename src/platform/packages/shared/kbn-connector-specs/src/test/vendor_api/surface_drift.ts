/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorDrift, DriftReportEntry, FailedDrift, SpecChange } from './detect_drift';
import type { VendorApiLog } from './update_vendor_api';

/** The label of every drift issue; the connector is named by a marker in the body. */
export const DRIFT_ISSUE_LABEL = 'connector-validation';

const MAX_CHANGES_PER_KIND = 30;
// GitHub rejects issue bodies longer than 65536 characters.
const MAX_BODY_LENGTH = 60000;

export interface DriftIssue {
  readonly number: number;
  readonly state: 'open' | 'closed';
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
    changes: { body?: string; state?: 'open' | 'closed' }
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
  /** The teams owning a connector's folder, mentioned in its issue. */
  readonly ownersOf: (connector: string) => readonly string[];
  /** The build that ran the check, linked from comments. */
  readonly buildUrl?: string;
  readonly log: VendorApiLog;
}

const markerOf = (connector: string): string => `<!-- ${DRIFT_ISSUE_LABEL}:${connector} -->`;

const isFailed = (entry: DriftReportEntry): entry is FailedDrift => 'error' in entry;

const VERDICTS: Record<ConnectorDrift['verdict'], string> = {
  healthy: 'healthy: the actions pass against the committed snapshots and the latest specs',
  'vendor-drift':
    'vendor drift: the actions pass against the committed snapshots, but fail against the latest vendor specs',
  'kibana-regression':
    'Kibana-side regression: the actions fail against the committed snapshots already',
  unknown: 'unknown: a latest vendor spec did not load',
};

const changeLine = ({ operation, text, id }: SpecChange): string =>
  `- ${operation ? `\`${operation}\`: ` : ''}${text} (\`${id}\`)`;

const changeList = (changes: readonly SpecChange[]): string[] => [
  ...changes.slice(0, MAX_CHANGES_PER_KIND).map(changeLine),
  ...(changes.length > MAX_CHANGES_PER_KIND
    ? [`- …and ${changes.length - MAX_CHANGES_PER_KIND} more`]
    : []),
];

const problemSection = (title: string, problems: readonly string[] = []): string[] =>
  problems.length > 0 ? [`### ${title}`, '', ...problems.map((p) => `- ${p}`), ''] : [];

const sourceSection = (drift: ConnectorDrift): string[] =>
  Object.entries(drift.sources).flatMap(([name, { status, error, changes }]) => {
    if (status === 'unchanged') {
      return [];
    }
    if (status === 'unreachable') {
      return [`#### \`${name}\`: unreachable`, '', `\`${error ?? 'unknown error'}\``, ''];
    }
    if (changes === undefined) {
      return [`#### \`${name}\`: changed, not classified (no \`oasdiff\` was available)`, ''];
    }
    const notable = changes.filter(({ kind }) => kind !== 'non-breaking');
    const other = changes.filter(({ kind }) => kind === 'non-breaking');
    return [
      `#### \`${name}\`: changed`,
      '',
      ...changeList(notable),
      ...(other.length > 0
        ? [
            '',
            `<details><summary>${other.length} non-breaking change(s)</summary>`,
            '',
            ...changeList(other),
            '',
            '</details>',
          ]
        : []),
      '',
    ];
  });

/** The title and body of a connector's drift issue; the same drift always renders the same. */
export const renderDriftIssue = (
  drift: ConnectorDrift,
  owners: readonly string[]
): { title: string; body: string } => {
  const id = drift.connector.replace(/^\./, '');
  const changes = sourceSection(drift);
  const body = [
    markerOf(drift.connector),
    `The weekly vendor API drift check found that the \`${drift.connector}\` connector needs attention.`,
    '',
    `**Two-mock result:** ${VERDICTS[drift.verdict]}.`,
    '',
    ...(changes.length > 0 ? ['### Vendor spec changes', '', ...changes] : []),
    ...problemSection('Problems against the latest vendor specs', drift.latestProblems),
    ...problemSection('Problems against the committed snapshots', drift.snapshotProblems),
    ...problemSection(
      'Overlay actions that no longer apply to the latest specs',
      drift.overlayFindings
    ),
    '### What to do',
    '',
    `- Fix it with the \`update-connector\` skill (\`src/platform/packages/shared/kbn-connector-specs/.claude/skills\`), for example \`/update-connector ${id} <this issue>\` in Claude Code. It reproduces the drift, fixes the connector, refreshes its artifacts and opens a draft PR.`,
    `- Or by hand. Reproduce: \`node scripts/connector_vendor_api --drift --connector ${id}\``,
    `- Once the connector handles the change, refresh its artifacts: \`node scripts/connector_vendor_api --connector ${id} --refresh\``,
    '- This issue is updated by later runs, and closed once the check finds the connector healthy.',
    ...(owners.length > 0 ? ['', `cc ${owners.join(' ')}`] : []),
  ].join('\n');
  return {
    title: `[Connector validation] Vendor API drift in ${drift.connector}`,
    body:
      body.length > MAX_BODY_LENGTH
        ? `${body.slice(
            0,
            MAX_BODY_LENGTH
          )}\n\n…truncated; run the command above for the full report.`
        : body,
  };
};

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

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Turns a drift report into GitHub issues: one per connector that needs one, found again by the
 * marker in its body, updated or reopened when the findings change, and closed once the
 * connector is healthy. Connectors that only need a refresh are listed for the refresh PR.
 */
export const surfaceDrift = async ({
  report,
  tracker,
  repo,
  dryRun,
  ownersOf,
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
          await write(`close #${existing.number} (${connector} is healthy)`, async () => {
            await tracker.comment(
              existing.number,
              `The drift check found \`${connector}\` healthy${build}; closing.`
            );
            await tracker.update(existing.number, { state: 'closed' });
          });
          actions.push({ connector, action: 'closed', issue: existing });
        } else {
          actions.push({ connector, action: outcome });
        }
        continue;
      }

      const { title, body } = renderDriftIssue(entry, ownersOf(connector));
      if (!existing) {
        let created: DriftIssue | undefined;
        await write(`create an issue for ${connector}: ${title}`, async () => {
          created = await tracker.create({ title, body, labels: [DRIFT_ISSUE_LABEL] });
        });
        actions.push({ connector, action: 'created', ...(created ? { issue: created } : {}) });
      } else if (existing.state === 'closed') {
        await write(`reopen #${existing.number} for ${connector}`, async () => {
          await tracker.update(existing.number, { body, state: 'open' });
          await tracker.comment(
            existing.number,
            `The drift check found \`${connector}\` drifting again${build}; reopening.`
          );
        });
        actions.push({ connector, action: 'reopened', issue: existing });
      } else if (existing.body.trim() !== body.trim()) {
        await write(`update #${existing.number} for ${connector}`, async () => {
          await tracker.update(existing.number, { body });
          await tracker.comment(
            existing.number,
            `The drift check found new findings for \`${connector}\`${build}; the description is updated.`
          );
        });
        actions.push({ connector, action: 'updated', issue: existing });
      } else {
        actions.push({ connector, action: 'unchanged', issue: existing });
      }
    } catch (error) {
      log.warning(`${connector}: ${message(error)}`);
      actions.push({ connector, action: 'failed', error: message(error) });
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
