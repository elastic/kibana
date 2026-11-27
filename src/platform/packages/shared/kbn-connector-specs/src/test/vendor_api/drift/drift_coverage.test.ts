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
import type { DriftCoverage } from './drift_coverage';
import {
  driftCoverageOf,
  renderCoverageAnnotation,
  summarizeDriftCoverage,
} from './drift_coverage';

const action = (
  name: string,
  operations: number,
  unmatched = 0
): Pick<ActionDrift, 'action' | 'operations' | 'unmatched'> => ({
  action: name,
  operations: Array.from({ length: operations }, (_, index) => ({
    source: 'rest',
    operation: `GET /items/${index}`,
  })),
  unmatched: Array.from({ length: unmatched }, (_, index) => ({
    operation: `POST /mcp/${index}`,
    reason: 'An MCP tool no spec describes',
  })),
});

const manifest = (sources: Record<string, { captured?: true }>): VendorApiManifest => ({
  sources: Object.fromEntries(
    Object.entries(sources).map(([name, { captured }]) => [
      name,
      {
        format: 'openapi',
        url: `https://example.com/${name}.json`,
        fetchedAt: '2026-11-27T00:00:00.000Z',
        ...(captured ? { captured, note: 'Captured with a trial account' } : {}),
      },
    ])
  ),
  operations: {},
});

describe('driftCoverageOf', () => {
  it('counts the actions that call an operation a source describes', () => {
    expect(
      driftCoverageOf(manifest({ rest: {}, mcp: { captured: true } }), [
        action('search', 2),
        action('run', 0, 3),
        action('both', 1, 1),
        action('test', 0),
      ] as ActionDrift[])
    ).toEqual({
      trackedActions: 2,
      totalActions: 4,
      followingSources: ['rest'],
      pinnedSources: ['mcp'],
      unmatchedRequests: 4,
    });
  });
});

const document = (
  id: string,
  fields: Partial<ConnectorCoverageDocument> = {}
): ConnectorCoverageDocument =>
  ({
    connector_id: id,
    total_actions: 3,
    drift_checkable: true,
    ...fields,
  } as ConnectorCoverageDocument);

const drift = (
  connector: string,
  coverage: Partial<DriftCoverage> = {},
  sources: ConnectorDrift['sources'] = { rest: { status: 'unchanged' } }
): ConnectorDrift =>
  ({
    connector,
    sources,
    coverage: {
      trackedActions: 2,
      totalActions: 3,
      followingSources: ['rest'],
      pinnedSources: [],
      unmatchedRequests: 1,
      ...coverage,
    },
  } as ConnectorDrift);

const pinned = { followingSources: [], pinnedSources: ['mcp'] };

// An entry of a report written before `coverage` existed.
const legacy = (connector: string, sources: ConnectorDrift['sources']): ConnectorDrift => ({
  connector,
  sources,
  operationsChanged: false,
  snapshotProblems: [],
  verdict: 'healthy',
  overlayFindings: [],
  outcome: 'none',
});

const documents = [
  document('.github'),
  document('.box', { total_actions: 5 }),
  document('.mysql', {
    drift_checkable: false,
    exemption_category: 'permanent',
    total_actions: 4,
  }),
  document('.salesforce', {
    drift_checkable: false,
    exemption_category: 'temporary',
    total_actions: 2,
  }),
  document('.monday_com', { drift_checkable: false, total_actions: 18 }),
];

describe('summarizeDriftCoverage', () => {
  it('combines the coverage of every connector with the drift of the recorded ones', () => {
    const report: DriftReportEntry[] = [
      drift('.github'),
      drift('.box', { ...pinned, totalActions: 4 }, { mcp: { status: 'pinned' } }),
      { connector: '.zoom', error: 'unreachable' },
    ];

    expect(summarizeDriftCoverage(documents, report)).toEqual({
      totals: {
        connectors: 5,
        recorded: 2,
        exempt: 2,
        permanentExemptions: 1,
        temporaryExemptions: 1,
        unrecorded: 1,
        checked: 2,
        failed: 1,
        detectVendorChanges: 1,
        pinnedOnly: 1,
        unreachable: 0,
        detectionUnknown: 0,
        withoutCoverage: 0,
        trackedActions: 4,
        checkedActions: 7,
        allActions: 32,
      },
      connectors: [
        expect.objectContaining({ connector: '.box', pinnedSources: ['mcp'] }),
        expect.objectContaining({ connector: '.github' }),
      ],
    });
  });

  // A saved report may come from another checkout, where the connector declared other actions
  it("takes both of a connector's action counts from the drift report", () => {
    const { connectors } = summarizeDriftCoverage(documents, [
      drift('.box', { trackedActions: 5, totalActions: 5 }),
    ]);

    expect(connectors).toEqual([
      expect.objectContaining({ connector: '.box', trackedActions: 5, totalActions: 5 }),
    ]);
  });

  it("doesn't count a connector whose source couldn't be fetched as detecting changes", () => {
    const { totals, connectors } = summarizeDriftCoverage(documents, [
      drift('.github', {}, { rest: { status: 'unreachable', error: '503' } }),
    ]);

    expect(totals).toMatchObject({ checked: 1, detectVendorChanges: 0, unreachable: 1 });
    expect(connectors[0].unreachableSources).toEqual(['rest']);
  });

  // Such a report reads `unchanged` for a source pinned to a commit too, so a fetched source
  // can't tell whether the connector follows the vendor; `pinned` and `unreachable` still can.
  it('reads the definite source statuses of a report without coverage, and only those', () => {
    const old = [
      legacy('.github', { rest: { status: 'unchanged' } }),
      legacy('.box', { mcp: { status: 'pinned' } }),
      legacy('.zoom', { rest: { status: 'unreachable', error: '503' } }),
    ];

    const summary = summarizeDriftCoverage(documents, old);

    expect(summary.connectors).toEqual([]);
    expect(summary.totals).toMatchObject({
      checked: 3,
      withoutCoverage: 3,
      detectVendorChanges: 0,
      pinnedOnly: 1,
      unreachable: 1,
      detectionUnknown: 1,
    });
    // Unknown detection is the one fetched connector, not the three without action counts
    expect(renderCoverageAnnotation(summary)).toContain(
      "Of the 3 connectors checked, 0 can detect a vendor change (1 only has pinned sources; 1 had a source that couldn't be fetched; unknown for 1 connector the report has no coverage for). The report has no action counts for them."
    );
  });

  it('gives each checked connector one outcome', () => {
    const { totals } = summarizeDriftCoverage(documents, [
      drift('.github'),
      drift('.box', pinned, { mcp: { status: 'pinned' } }),
      drift('.zoom', {}, { rest: { status: 'unreachable', error: '503' } }),
      legacy('.zendesk', { rest: { status: 'changed' } }),
      legacy('.sentry', { rest: { status: 'unreachable', error: '503' } }),
    ]);

    expect(
      totals.detectVendorChanges + totals.pinnedOnly + totals.unreachable + totals.detectionUnknown
    ).toBe(totals.checked);
    expect(totals).toMatchObject({ unreachable: 2, detectionUnknown: 1 });
  });
});

describe('renderCoverageAnnotation', () => {
  it('states the totals and folds a row per checked connector', () => {
    const markdown = renderCoverageAnnotation(
      summarizeDriftCoverage(documents, [
        drift('.github'),
        drift('.box', pinned, { mcp: { status: 'pinned' } }),
      ])
    );

    expect(markdown).toContain(
      '**Coverage:** 2 of 5 connectors recorded, 2 exempt (1 permanent, 1 temporary) and 1 neither.'
    );
    expect(markdown).toContain(
      'Of the 2 connectors checked, 1 can detect a vendor change (1 only has pinned sources). They track 4 of their 6 actions. The connectors in this checkout declare 32 actions.'
    );
    expect(markdown).toContain('| `.box` | 2 of 3 | — | `mcp` | 1 |');
    expect(markdown).toContain('| `.github` | 2 of 3 | `rest` | — | 1 |');
    expect(markdown).toContain('<details><summary>Coverage per connector</summary>');
  });

  it('says how many connectors could not be checked, with no exceptions when there are none', () => {
    const markdown = renderCoverageAnnotation(
      summarizeDriftCoverage(documents, [drift('.github'), { connector: '.box', error: 'x' }])
    );

    expect(markdown).toContain("1 connector couldn't be checked.");
    expect(markdown).toContain('1 can detect a vendor change. They track');
  });

  it('marks sources that could not be fetched', () => {
    const markdown = renderCoverageAnnotation(
      summarizeDriftCoverage(documents, [
        drift('.github', {}, { rest: { status: 'unreachable', error: '503' } }),
      ])
    );

    expect(markdown).toContain(
      "0 can detect a vendor change (1 had a source that couldn't be fetched)."
    );
    expect(markdown).toContain('| `.github` | 2 of 3 | `rest` (unreachable) | — | 1 |');
  });

  it('says a report without coverage has no action counts, and has no table', () => {
    const markdown = renderCoverageAnnotation(
      summarizeDriftCoverage(documents, [legacy('.github', { rest: { status: 'unchanged' } })])
    );

    expect(markdown).toContain(
      'Of the 1 connector checked, 0 can detect a vendor change (unknown for 1 connector the report has no coverage for). The report has no action counts for them.'
    );
    expect(markdown).not.toContain('<details>');
  });

  it('says how many checked connectors have no action counts', () => {
    expect(
      renderCoverageAnnotation(
        summarizeDriftCoverage(documents, [
          drift('.github'),
          legacy('.box', { rest: { status: 'unchanged' } }),
        ])
      )
    ).toContain(
      'They track 2 of their 3 actions (the report has no action counts for 1 connector).'
    );
  });
});
