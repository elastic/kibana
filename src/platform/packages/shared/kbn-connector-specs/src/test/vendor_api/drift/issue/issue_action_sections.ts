/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The sections about the connector's own actions: the facts, the Actions table and its legend. */

import type { ConnectorDrift } from '../detect_drift';
import { OVERLAY, snapshotFile } from '../../spec/load_vendor_specs';
import type { DriftConclusions } from './drift_conclusions';
import { ICONS, MOVED_STATUS, OUTCOMES, PASSES, RANKS } from './action_status';
import { cell, code, link, listed } from './issue_markdown';

/** The row that says when the check last ran; it changes every run, so findings skip it. */
export const LAST_CHECKED_ROW = '| **Last checked** |';

// What the check found, for the Result row; vendor drift needn't come from a failing action.
const resultOf = (verdict: ConnectorDrift['verdict'], actionsFail: boolean): string => {
  switch (verdict) {
    case 'healthy':
      return 'Every checked action passes against the committed snapshot and the latest spec';
    case 'vendor-drift':
      return actionsFail
        ? 'Vendor drift: passes against the committed snapshot, fails against the latest spec'
        : 'Vendor drift: every checked action passes, but the latest spec has problems the committed snapshot has not';
    case 'kibana-regression':
      return 'Regression: fails against the committed snapshot already';
    default:
      return 'Unknown: a latest spec did not load';
  }
};

/** The two-column table under the alert: the connector, the verdict and each vendor spec. */
export const factsOf = (
  drift: ConnectorDrift,
  found: DriftConclusions,
  buildUrl: string | undefined
): string[] => {
  const { folder } = drift;
  const { failing } = found;
  const facts: string[] = [
    `| **Connector** | ${link(code(drift.connector), folder)} |`,
    `| **Result** | ${resultOf(drift.verdict, failing.length > 0)} |`,
  ];
  for (const [source, { status, error, url, servers }] of Object.entries(drift.sources)) {
    const latest = url ? `[Latest](${url})` : 'Latest';
    const state =
      status === 'unreachable' ? `unreachable: ${code(error ?? 'unknown error')}` : status;
    facts.push(
      `| **Vendor spec ${code(source)}** | ${latest} (${cell(state)}) · ${link(
        'Committed snapshot',
        folder,
        `vendor_api/${snapshotFile(source)}`
      )} |`
    );
    // A spec can list a server twice.
    const [before, after] = servers
      ? [[...new Set(servers.snapshot)], [...new Set(servers.latest)]]
      : [[], []];
    if (servers && before.join() !== after.join()) {
      const label = Object.keys(drift.sources).length > 1 ? ` ${code(source)}` : '';
      facts.push(
        `| **Server URL${label}** | ${before.map(code).join(', ') || 'none'} → ${
          after.map(code).join(', ') || 'none'
        } |`
      );
    }
  }
  if (drift.checkedAt) {
    facts.push(
      `${LAST_CHECKED_ROW} ${drift.checkedAt.slice(0, 10)}${
        buildUrl ? ` ([build](${buildUrl}))` : ''
      } |`
    );
  }
  return facts;
};

/** The Actions table: every action with what it calls, its status and the details. */
export const actionsSection = (drift: ConnectorDrift, found: DriftConclusions): string[] => {
  const { actions, statuses, notChecked, moved, serverPaths } = found;
  const ordered = actions
    .map((action) => ({ action, status: statuses.get(action.action) ?? PASSES }))
    .sort(
      (a, b) =>
        RANKS.indexOf(a.status.rank) - RANKS.indexOf(b.status.rank) ||
        a.action.action.localeCompare(b.action.action)
    );
  const actionRows = ordered.map(({ action, status }) => {
    const calls =
      action.operations.length > 0
        ? action.operations.map(({ operation }) => code(operation))
        : action.unmatched.map(({ operation }) => code(operation));
    return `| ${code(action.action)} | ${calls.join('<br>') || '—'} | ${
      OUTCOMES[status.outcome]
    } | ${cell(status.details)} |`;
  });
  const legend: string[] = [];
  if (moved.length > 0) {
    const servers = [
      ...new Set(moved.flatMap(({ source }) => drift.sources[source]?.servers?.latest ?? [])),
    ];
    legend.push(
      `${
        ICONS.attention
      } **${MOVED_STATUS}:** the latest spec has the operation without the ${listed(
        serverPaths.map(code)
      )} prefix, which is now part of its server URL${
        servers.length > 0 ? ` (${servers.map(code).join(', ')})` : ''
      }, so the request goes to the same place.`
    );
  }
  const reasons = new Map<string, string[]>();
  for (const action of notChecked) {
    for (const { reason } of action.unmatched) {
      const named = reasons.get(reason) ?? [];
      if (!named.includes(action.action)) {
        reasons.set(reason, [...named, action.action]);
      }
    }
  }
  for (const [reason, named] of reasons) {
    legend.push(
      `${ICONS['not-checked']} **Not in the spec** (${named
        .map(code)
        .join(', ')}): the manifest records why: _${reason}_`
    );
  }
  if (actions.length === 0) {
    return [];
  }
  return [
    '### Actions',
    '',
    '| Action | Calls | Status | Details |',
    '|---|---|---|---|',
    ...actionRows,
    '',
    ...legend.flatMap((line) => [line, '']),
  ];
};

// Why the check fails, when an overlay correction of the servers explains every move.
export const whySection = (drift: ConnectorDrift, found: DriftConclusions): string[] => {
  const { folder } = drift;
  const { serverPaths, movesCausedBy } = found;
  const why =
    movesCausedBy !== undefined
      ? [
          '### Why the check fails',
          '',
          `Correction ${movesCausedBy + 1} in ${link(
            code(OVERLAY),
            folder,
            `vendor_api/${OVERLAY}`
          )} changes the spec's servers, so the check matches requests against the spec's paths alone. Now that ${listed(
            serverPaths.map(code)
          )} is part of the server URL, the paths no longer include it, and requests to ${listed(
            serverPaths.map((serverPath) => code(`${serverPath}/…`))
          )} match nothing.`,
          '',
        ]
      : [];
  return why;
};

/** The response fields each action reads whose schema changed between the two specs. */
export const changedFieldsSection = (found: DriftConclusions): string[] => {
  const { actions } = found;
  const changedFields = actions.flatMap(({ action, fieldChanges = [] }) =>
    fieldChanges.map((change) => ({ action, ...change }))
  );
  const fieldsSection =
    changedFields.length > 0
      ? [
          '### Changed fields the actions read',
          '',
          'The fields each action reads from the responses, recorded while the check ran it, compared between the committed snapshot and the latest spec.',
          '',
          '| Action | Operation | Field | Change |',
          '|---|---|---|---|',
          ...changedFields.map(
            ({ action, operation, field, changes: what }) =>
              `| ${code(action)} | ${code(operation)} | ${code(field)} | ${cell(what.join('; '))} |`
          ),
          '',
        ]
      : [];
  return fieldsSection;
};
