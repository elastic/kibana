/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The alert a drift issue opens with: how many actions work, which need attention and why, and
 * what to do about it. Everything below it is detail; this is the part an owner reads first.
 */

import type { ConnectorDrift } from '../detect_drift';
import { OVERLAY } from '../../spec/load_vendor_specs';
import type { FailureReason } from './action_status';
import type { Attention, DriftConclusions } from './drift_conclusions';
import { code, fails, listed, plural } from './issue_markdown';
import { AFFECTED } from './review_item';

const MAX_NAMED_ACTIONS = 8;

/** The kind of GitHub alert the issue opens with. */
export type AlertKind = 'NOTE' | 'WARNING' | 'CAUTION';

// Specs that start documenting OAuth scopes per operation drop the other schemes by accident.
const CREDENTIALS_ADVICE = `Check the vendor's docs on authentication: if they still accept the connector's credentials, correct the spec in \`${OVERLAY}\` rather than the connector.`;

// The actions table has the details.
const FAILURES: ReadonlyArray<readonly [FailureReason, readonly [string, string]]> = [
  [
    'credentials',
    [
      "fails because the latest spec requires credentials it doesn't send",
      "fail because the latest spec requires credentials they don't send",
    ],
  ],
  ['latest', ['fails against the latest vendor spec', 'fail against the latest vendor spec']],
  ['snapshot', ['fails against the committed snapshot', 'fail against the committed snapshot']],
  [
    'removed',
    [
      'calls an endpoint removed from the current spec',
      'call endpoints removed from the current spec',
    ],
  ],
  [
    'moved',
    [
      'calls an endpoint that moved in the spec, keeping its URL',
      'call endpoints that moved in the spec, keeping their URL',
    ],
  ],
];

/** One sentence per way of failing, naming the actions: "`a` and `b` fail against …". */
const failureSentences = (failing: Attention['failing']): string[] =>
  FAILURES.flatMap(([failure, [one, many]]) => {
    const named = failing
      .filter(({ reason }) => reason === failure)
      .map(({ action }) => code(action));
    return named.length > 0
      ? [`${listed(named, MAX_NAMED_ACTIONS)} ${named.length === 1 ? one : many}.`]
      : [];
  });

/**
 * The alert at the top of the issue: what the check concluded, which actions need attention and
 * why, and what to do about it.
 */
export const summaryOf = (
  drift: ConnectorDrift,
  found: DriftConclusions
): { alert: AlertKind; summary: string } => {
  const { attention, failing, movedOnly, movesCausedBy, serverPaths, stale } = found;
  const name = drift.displayName ?? drift.connector;
  // Actions the manifest records as calling endpoints no spec describes, which aren't checked.
  const { notInSpec } = attention;
  const notInSpecNote =
    notInSpec.length > 0
      ? [
          `${listed(notInSpec.map(code), MAX_NAMED_ACTIONS)} ${
            notInSpec.length === 1 ? 'calls an endpoint' : 'call endpoints'
          } no spec describes, so ${
            notInSpec.length === 1 ? "it isn't" : "they aren't"
          } checked (see the table).`,
        ]
      : [];
  // The note: how many actions work, which need attention and why, and what to do.
  const passingSummary = (extra: readonly string[]): string => {
    const { unattached, total } = attention;
    const working = total - attention.actions.size;
    // A failing action is named for its failure only, not as passing with changes.
    const failed = new Set(attention.failing.map(({ action }) => action));
    const readers = attention.readers.filter((action) => !failed.has(action));
    const byKind = [...attention.byKind].map(
      ([kind, named]) =>
        [kind, new Set([...named].filter((action) => !failed.has(action)))] as const
    );
    // The actions are the point of these sentences, so more of them are named.
    const sentence = (named: readonly string[], [one, many]: readonly [string, string]) =>
      `${listed(named.map(code), MAX_NAMED_ACTIONS)} ${named.length === 1 ? one : many}.`;
    const credentialFailures = attention.failing.filter(({ reason }) => reason === 'credentials');
    const onlyCredentials =
      credentialFailures.length > 0 && credentialFailures.length === attention.actions.size;
    // The credentials sentence comes first; its advice follows it, or closes the note when
    // nothing else needs attention.
    const [firstFailure, ...otherFailures] = failureSentences(attention.failing);
    const reasons = [
      ...(firstFailure === undefined ? [] : [firstFailure]),
      ...(credentialFailures.length > 0 && !onlyCredentials ? [CREDENTIALS_ADVICE] : []),
      ...otherFailures,
      ...(readers.length > 0
        ? [
            sentence(readers, [
              'passes but reads fields that changed',
              'pass but read fields that changed',
            ]),
          ]
        : []),
      ...byKind
        .filter(([, named]) => named.size > 0)
        .map(([kind, named]) => sentence([...named], AFFECTED[kind])),
      ...(unattached > 0
        ? [
            `${plural(unattached, 'other spec change')} ${
              unattached === 1 ? 'needs' : 'need'
            } review (see "Other problems").`,
          ]
        : []),
      ...(stale.length > 0
        ? [
            `${plural(stale.length, 'spec correction')} in \`${OVERLAY}\` no longer ${
              stale.length === 1 ? 'applies' : 'apply'
            }.`,
          ]
        : []),
      ...extra,
    ];
    const headline =
      attention.actions.size === 0
        ? `**All ${plural(total, 'action')} ${
            total === 1 ? 'works' : 'work'
          } with the latest spec.**`
        : `**${working} of ${plural(total, 'action')} ${
            working === 1 ? 'works' : 'work'
          } with the latest spec. ${plural(attention.actions.size, 'action')} ${
            attention.actions.size === 1 ? 'needs' : 'need'
          } attention.**`;
    return [
      headline,
      [reasons.length > 0 ? reasons.join(' ') : 'Its spec changed.', ...notInSpecNote].join(' '),
      onlyCredentials
        ? CREDENTIALS_ADVICE
        : attention.actions.size > 0
        ? 'Update the connector to ensure it will continue working.'
        : "The actions don't need to change; fix what the tables below list.",
    ].join('\n\n');
  };

  // Vendor drift gets the same note, unless every failing action only moved in the spec, which
  // has its own diagnosis.
  const vendorDriftNote = drift.verdict === 'vendor-drift' && !movedOnly;
  const otherLatest = found.latestProblems.length;
  const outsideActions =
    otherLatest > 0
      ? [
          `The check found ${plural(otherLatest, 'problem')} outside the actions, which ${
            otherLatest === 1 ? "doesn't" : "don't"
          } occur against the committed snapshot (see "Other problems").`,
        ]
      : [];
  let alert: AlertKind;
  let summary: string;
  switch (drift.verdict) {
    case 'unknown':
      alert = 'WARNING';
      summary = `**A latest vendor spec of \`${drift.connector}\` couldn't be loaded,** so the actions weren't checked against it.`;
      break;
    case 'kibana-regression':
      alert = 'CAUTION';
      summary =
        failing.length > 0
          ? `**${plural(failing.length, 'action')} of \`${drift.connector}\` ${fails(
              failing.length
            )} against the committed snapshot.** The vendor didn't cause this: the connector, its fixtures or the checking tooling changed.`
          : `**The committed snapshot of \`${
              drift.connector
            }\` fails the drift check, though every checked action passes against it:** the check found ${plural(
              found.snapshotProblems.length,
              'problem'
            )} outside the actions (see "Other problems"). The vendor didn't cause this: the connector, its artifacts or the checking tooling changed.`;
      break;
    case 'vendor-drift':
      if (vendorDriftNote) {
        alert = 'WARNING';
        summary = passingSummary(outsideActions);
      } else {
        alert = 'NOTE';
        summary = `**${name}'s spec moved ${listed(
          serverPaths.map(code)
        )} from its paths into its server URL. The connector most likely still works.** The check can't match the requests of ${plural(
          failing.length,
          'action'
        )} to the latest spec, so it didn't check ${
          failing.length === 1 ? 'it' : 'them'
        }, but every operation ${
          failing.length === 1 ? 'it calls' : 'they call'
        } is still in the latest spec, at the same full URL.${
          movesCausedBy !== undefined
            ? ` Update the connector's spec corrections in \`${OVERLAY}\`, not the connector.`
            : ''
        }`;
      }
      break;
    default:
      alert = 'NOTE';
      summary = passingSummary([]);
  }
  // The note for passing actions has it already.
  if (!(drift.verdict === 'healthy' || vendorDriftNote) && notInSpecNote.length > 0) {
    summary += ` ${notInSpecNote.join(' ')}`;
  }
  return { alert, summary };
};
