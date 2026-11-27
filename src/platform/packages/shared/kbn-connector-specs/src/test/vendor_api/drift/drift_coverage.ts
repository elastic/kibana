/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorCoverageDocument } from '../connector_coverage/connector_coverage';
import type { VendorApiManifest } from '../manifest';
import type { ActionDrift, DriftReportEntry } from './detect_drift';

/** How much of a recorded connector the drift check covers. */
export interface DriftCoverage {
  /**
   * Actions that call at least one operation a source describes, so a vendor change to it
   * reaches them. The others only make requests no spec describes, or none at all.
   */
  readonly trackedActions: number;
  /** Every action the connector declares. */
  readonly totalActions: number;
  /** Sources fetched from the vendor on every run, so a change to them is noticed. */
  readonly followingSources: readonly string[];
  /** Sources captured once with credentials, which only change when captured again. */
  readonly pinnedSources: readonly string[];
  /** Requests the manifest records as matching no operation, which drift doesn't check. */
  readonly unmatchedRequests: number;
}

export const driftCoverageOf = (
  manifest: VendorApiManifest,
  actions: readonly ActionDrift[]
): DriftCoverage => {
  const names = Object.keys(manifest.sources).sort();
  return {
    trackedActions: actions.filter(({ operations }) => operations.length > 0).length,
    totalActions: actions.length,
    followingSources: names.filter((name) => !manifest.sources[name].captured),
    pinnedSources: names.filter((name) => manifest.sources[name].captured),
    unmatchedRequests: actions.reduce((sum, { unmatched }) => sum + unmatched.length, 0),
  };
};

export interface CoverageTotals {
  /** Every connector in the repository. */
  readonly connectors: number;
  readonly recorded: number;
  readonly exempt: number;
  readonly permanentExemptions: number;
  readonly temporaryExemptions: number;
  /** Neither recorded nor exempt. */
  readonly unrecorded: number;
  /** Connectors the drift check ran on. */
  readonly checked: number;
  /** Connectors the drift check couldn't run on. */
  readonly failed: number;
  /** Checked connectors with at least one source that follows the vendor. */
  readonly detectVendorChanges: number;
  /** Tracked actions of the checked connectors. */
  readonly trackedActions: number;
  /** Every action of the checked connectors. */
  readonly checkedActions: number;
  /** Every action of every connector, recorded or not. */
  readonly allActions: number;
}

export interface ConnectorCoverageRow extends DriftCoverage {
  readonly connector: string;
}

export interface DriftCoverageSummary {
  readonly totals: CoverageTotals;
  /** One row per connector the drift check ran on, by connector id. */
  readonly connectors: readonly ConnectorCoverageRow[];
}

/**
 * Combines the coverage report, which describes every connector, with a drift report, which
 * describes the recorded ones it checked. The total number of actions comes from the coverage
 * report's `total_actions`, and the tracked ones from the drift report.
 */
export const summarizeDriftCoverage = (
  documents: readonly ConnectorCoverageDocument[],
  report: readonly DriftReportEntry[]
): DriftCoverageSummary => {
  const totalActionsOf = new Map(
    documents.map(({ connector_id: id, total_actions: total }) => [id, total])
  );
  const connectors = report
    .flatMap((entry): ConnectorCoverageRow[] =>
      'coverage' in entry && entry.coverage
        ? [
            {
              connector: entry.connector,
              ...entry.coverage,
              totalActions: totalActionsOf.get(entry.connector) ?? entry.coverage.totalActions,
            },
          ]
        : []
    )
    .sort((a, b) => a.connector.localeCompare(b.connector));
  const exempt = documents.filter(({ exemption_category: category }) => category !== undefined);
  const recorded = documents.filter(({ drift_checkable: checkable }) => checkable).length;
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  return {
    totals: {
      connectors: documents.length,
      recorded,
      exempt: exempt.length,
      permanentExemptions: exempt.filter(
        ({ exemption_category: category }) => category === 'permanent'
      ).length,
      temporaryExemptions: exempt.filter(
        ({ exemption_category: category }) => category === 'temporary'
      ).length,
      unrecorded: documents.length - recorded - exempt.length,
      checked: connectors.length,
      failed: report.filter((entry) => 'error' in entry).length,
      detectVendorChanges: connectors.filter(({ followingSources }) => followingSources.length > 0)
        .length,
      trackedActions: sum(connectors.map(({ trackedActions }) => trackedActions)),
      checkedActions: sum(connectors.map(({ totalActions }) => totalActions)),
      allActions: sum(documents.map(({ total_actions: total }) => total)),
    },
    connectors,
  };
};

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

const pinnedOnly = (count: number) => {
  if (count === 0) return '';
  return count === 1
    ? '; the other only has pinned sources'
    : `; the other ${count} only have pinned sources`;
};

const sourceList = (names: readonly string[]) =>
  names.length > 0 ? names.map((name) => `\`${name}\``).join(', ') : '—';

/** Markdown for the build annotation: the totals, then a folded table per connector. */
export const renderCoverageAnnotation = ({ totals, connectors }: DriftCoverageSummary): string => {
  const lines = [
    `**Coverage:** ${totals.recorded} of ${plural(totals.connectors, 'connector')} recorded, ` +
      `${totals.exempt} exempt (${totals.permanentExemptions} permanent, ` +
      `${totals.temporaryExemptions} temporary) and ${totals.unrecorded} neither.`,
    '',
    `Of the ${plural(totals.checked, 'connector')} checked, ${totals.detectVendorChanges} can ` +
      `detect a vendor change${pinnedOnly(totals.checked - totals.detectVendorChanges)}. They ` +
      `track ${totals.trackedActions} of their ${plural(totals.checkedActions, 'action')}; ` +
      `all connectors together declare ${plural(totals.allActions, 'action')}.` +
      (totals.failed > 0 ? ` ${plural(totals.failed, 'connector')} couldn't be checked.` : ''),
  ];
  if (connectors.length === 0) {
    return `${lines.join('\n')}\n`;
  }
  return `${[
    ...lines,
    '',
    '<details><summary>Coverage per connector</summary>',
    '',
    '| Connector | Actions tracked | Sources following the vendor | Pinned sources | Unmatched requests |',
    '| --- | ---: | --- | --- | ---: |',
    ...connectors.map(
      ({
        connector,
        trackedActions,
        totalActions,
        followingSources,
        pinnedSources,
        unmatchedRequests,
      }) =>
        `| \`${connector}\` | ${trackedActions} of ${totalActions} | ${sourceList(
          followingSources
        )} | ${sourceList(pinnedSources)} | ${unmatchedRequests} |`
    ),
    '',
    '</details>',
  ].join('\n')}\n`;
};
