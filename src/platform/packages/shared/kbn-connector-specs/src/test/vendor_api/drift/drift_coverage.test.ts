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

const drift = (connector: string, coverage: Partial<DriftCoverage> = {}): ConnectorDrift =>
  ({
    connector,
    coverage: {
      trackedActions: 2,
      totalActions: 3,
      followingSources: ['rest'],
      pinnedSources: [],
      unmatchedRequests: 1,
      ...coverage,
    },
  } as ConnectorDrift);

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
      drift('.box', { followingSources: [], pinnedSources: ['mcp'], totalActions: 4 }),
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
        trackedActions: 4,
        // From the coverage report's total_actions: 3 for .github, 5 for .box
        checkedActions: 8,
        allActions: 32,
      },
      connectors: [
        expect.objectContaining({ connector: '.box', totalActions: 5, pinnedSources: ['mcp'] }),
        expect.objectContaining({ connector: '.github', totalActions: 3 }),
      ],
    });
  });

  it('leaves out connectors from reports written before coverage existed', () => {
    const old = { connector: '.github' } as ConnectorDrift;

    expect(summarizeDriftCoverage(documents, [old]).connectors).toEqual([]);
  });
});

describe('renderCoverageAnnotation', () => {
  it('states the totals and folds a row per checked connector', () => {
    const markdown = renderCoverageAnnotation(
      summarizeDriftCoverage(documents, [
        drift('.github'),
        drift('.box', { followingSources: [], pinnedSources: ['mcp'] }),
      ])
    );

    expect(markdown).toContain(
      '**Coverage:** 2 of 5 connectors recorded, 2 exempt (1 permanent, 1 temporary) and 1 neither.'
    );
    expect(markdown).toContain(
      'Of the 2 connectors checked, 1 can detect a vendor change; the other only has pinned sources. They track 4 of their 8 actions; all connectors together declare 32 actions.'
    );
    expect(markdown).toContain('| `.box` | 2 of 5 | — | `mcp` | 1 |');
    expect(markdown).toContain('| `.github` | 2 of 3 | `rest` | — | 1 |');
    expect(markdown).toContain('<details><summary>Coverage per connector</summary>');
  });

  it('says how many connectors could not be checked, and leaves out pinned ones when none are', () => {
    const markdown = renderCoverageAnnotation(
      summarizeDriftCoverage(documents, [drift('.github'), { connector: '.box', error: 'x' }])
    );

    expect(markdown).toContain("1 connector couldn't be checked.");
    expect(markdown).toContain('1 can detect a vendor change. They track');
  });

  it('counts the connectors that only have pinned sources', () => {
    const pinned = { followingSources: [], pinnedSources: ['mcp'] };

    expect(
      renderCoverageAnnotation(
        summarizeDriftCoverage(documents, [drift('.github', pinned), drift('.box', pinned)])
      )
    ).toContain('0 can detect a vendor change; the other 2 only have pinned sources.');
  });

  it('has no table when no connector was checked', () => {
    expect(renderCoverageAnnotation(summarizeDriftCoverage(documents, []))).not.toContain(
      '<details>'
    );
  });
});
