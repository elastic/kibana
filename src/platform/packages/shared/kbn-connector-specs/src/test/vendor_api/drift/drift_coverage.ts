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
import type { ActionDrift, ConnectorDrift, DriftReportEntry } from './detect_drift';

/** How much of a recorded connector the drift check covers. */
export interface DriftCoverage {
  /**
   * Actions that call at least one operation a source describes, so a vendor change to it
   * reaches them. The others only make requests no spec describes, or none at all.
   */
  readonly trackedActions: number;
  /** Every action the connector declares, as the coverage report's `total_actions` counts them. */
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
  /**
   * Checked connectors whose sources that follow the vendor were all fetched this run, so a
   * change to them would have been noticed.
   */
  readonly detectVendorChanges: number;
  /** Checked connectors with only pinned sources, which can't notice a change. */
  readonly pinnedOnly: number;
  /** Checked connectors a source of which couldn't be fetched this run. */
  readonly unreachable: number;
  /** Checked connectors whose drift entry has no coverage, from a report written before it. */
  readonly withoutCoverage: number;
  /** Tracked actions of the checked connectors that have coverage. */
  readonly trackedActions: number;
  /** Every action of the checked connectors that have coverage. */
  readonly checkedActions: number;
  /** Every action of every connector, recorded or not. */
  readonly allActions: number;
}

export interface ConnectorCoverageRow extends DriftCoverage {
  readonly connector: string;
  /** Sources that follow the vendor but couldn't be fetched this run. */
  readonly unreachableSources: readonly string[];
}

export interface DriftCoverageSummary {
  readonly totals: CoverageTotals;
  /** One row per checked connector with coverage, by connector id. */
  readonly connectors: readonly ConnectorCoverageRow[];
}

const isChecked = (entry: DriftReportEntry): entry is ConnectorDrift => !('error' in entry);

const sourcesWith = ({ sources }: ConnectorDrift, status: string): string[] =>
  Object.keys(sources)
    .filter((name) => sources[name].status === status)
    .sort();

const unreachableSourcesOf = (entry: ConnectorDrift): string[] => sourcesWith(entry, 'unreachable');

// Read from the source statuses, which every report has, rather than from `coverage`, which
// reports written before it lack. A captured source is reported as `pinned`.
const followsVendor = (entry: ConnectorDrift): boolean =>
  Object.keys(entry.sources).length > sourcesWith(entry, 'pinned').length;

/**
 * Combines the coverage report, which describes every connector, with a drift report, which
 * describes the recorded ones it checked. Both of a connector's action counts come from the drift
 * report, so they describe the same checkout even when the report was saved earlier; the total
 * across all connectors comes from the coverage report's `total_actions`.
 */
export const summarizeDriftCoverage = (
  documents: readonly ConnectorCoverageDocument[],
  report: readonly DriftReportEntry[]
): DriftCoverageSummary => {
  const checked = report.filter(isChecked);
  const unreachable = checked.filter((entry) => unreachableSourcesOf(entry).length > 0);
  const connectors = checked
    .flatMap((entry): ConnectorCoverageRow[] =>
      entry.coverage
        ? [
            {
              connector: entry.connector,
              ...entry.coverage,
              unreachableSources: unreachableSourcesOf(entry),
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
      checked: checked.length,
      failed: report.length - checked.length,
      detectVendorChanges: checked.filter(
        (entry) => followsVendor(entry) && unreachableSourcesOf(entry).length === 0
      ).length,
      pinnedOnly: checked.filter(
        (entry) => Object.keys(entry.sources).length > 0 && !followsVendor(entry)
      ).length,
      unreachable: unreachable.length,
      withoutCoverage: checked.length - connectors.length,
      trackedActions: sum(connectors.map(({ trackedActions }) => trackedActions)),
      checkedActions: sum(connectors.map(({ totalActions }) => totalActions)),
      allActions: sum(documents.map(({ total_actions: total }) => total)),
    },
    connectors,
  };
};

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

const sourceList = (names: readonly string[], unreachable: readonly string[] = []) =>
  names.length > 0
    ? names
        .map((name) => `\`${name}\`${unreachable.includes(name) ? ' (unreachable)' : ''}`)
        .join(', ')
    : '—';

const checkedSentence = (totals: CoverageTotals): string => {
  const verb = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const exceptions = [
    totals.pinnedOnly > 0
      ? `${verb(totals.pinnedOnly, 'only has', 'only have')} pinned sources`
      : '',
    totals.unreachable > 0 ? `${totals.unreachable} had a source that couldn't be fetched` : '',
  ].filter(Boolean);
  const unknown =
    totals.withoutCoverage > 0
      ? ` (the report has no action counts for ${plural(totals.withoutCoverage, 'connector')})`
      : '';
  const actions =
    totals.checked > totals.withoutCoverage
      ? ` They track ${totals.trackedActions} of their ${plural(
          totals.checkedActions,
          'action'
        )}${unknown}.`
      : ' The report has no action counts for them.';
  // The drift report may have been saved from another checkout, so the repository's total is
  // named as this checkout's rather than read as a superset of the checked connectors' actions.
  return (
    `Of the ${plural(totals.checked, 'connector')} checked, ${totals.detectVendorChanges} can ` +
    `detect a vendor change${exceptions.length > 0 ? ` (${exceptions.join('; ')})` : ''}.` +
    `${actions} The connectors in this checkout declare ${plural(totals.allActions, 'action')}.` +
    (totals.failed > 0 ? ` ${plural(totals.failed, 'connector')} couldn't be checked.` : '')
  );
};

/** Markdown for the build annotation: the totals, then a folded table per connector. */
export const renderCoverageAnnotation = ({ totals, connectors }: DriftCoverageSummary): string => {
  const lines = [
    `**Coverage:** ${totals.recorded} of ${plural(totals.connectors, 'connector')} recorded, ` +
      `${totals.exempt} exempt (${totals.permanentExemptions} permanent, ` +
      `${totals.temporaryExemptions} temporary) and ${totals.unrecorded} neither.`,
    '',
    checkedSentence(totals),
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
        unreachableSources,
        unmatchedRequests,
      }) =>
        `| \`${connector}\` | ${trackedActions} of ${totalActions} | ${sourceList(
          followingSources,
          unreachableSources
        )} | ${sourceList(pinnedSources)} | ${unmatchedRequests} |`
    ),
    '',
    '</details>',
  ].join('\n')}\n`;
};
