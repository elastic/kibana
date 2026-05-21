/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DashboardOptions {
  kibanaUrl: string;
  kibanaApiKey: string;
  /** Existing dashboard ID to update. Omit to create a new dashboard. */
  dashboardId?: string;
  /**
   * ES base URL used to set up the mock snyk-follower index.
   * Defaults to https://localhost:9200.
   */
  esUrl?: string;
  /**
   * When true (default), create the mock snyk-follower index if it does not
   * already exist. Pass false when real Snyk data is already indexed.
   */
  snykMock?: boolean;
}

// ---------------------------------------------------------------------------
// Mock Snyk index setup
// ---------------------------------------------------------------------------

const SNYK_INDEX = 'snyk-follower';

const SNYK_MOCK_DOCS = [
  { pkg: 'moment',            snyk: 'SNYK-JS-MOMENT-2944725',          cve: 'CVE-2022-24785', sev: 'high',     cvss: 7.5, desc: 'Path Traversal',           upgradable: true,  fixable: true,  slo: 'fail', slo_rem: -45,  intro: '2022-04-04' },
  { pkg: 'moment',            snyk: 'SNYK-JS-MOMENT-10910669',         cve: 'CVE-2022-31129', sev: 'high',     cvss: 7.5, desc: 'Regular Expression DoS',   upgradable: true,  fixable: true,  slo: 'fail', slo_rem: -30,  intro: '2022-07-06' },
  { pkg: 'lodash',            snyk: 'SNYK-JS-LODASH-567746',           cve: 'CVE-2019-10744', sev: 'critical', cvss: 9.1, desc: 'Prototype Pollution',       upgradable: true,  fixable: true,  slo: 'fail', slo_rem: -180, intro: '2019-07-26' },
  { pkg: 'lodash',            snyk: 'SNYK-JS-LODASH-608086',           cve: 'CVE-2020-8203',  sev: 'high',     cvss: 7.4, desc: 'Prototype Pollution',       upgradable: true,  fixable: true,  slo: 'fail', slo_rem: -90,  intro: '2020-07-15' },
  { pkg: 'react-redux',       snyk: 'SNYK-JS-REACTREDUX-9901234',      cve: 'CVE-2024-12345', sev: 'medium',   cvss: 5.3, desc: 'Improper Input Validation',  upgradable: false, fixable: false, slo: 'pass', slo_rem: 12,   intro: '2024-11-01' },
  { pkg: 'rxjs',              snyk: 'SNYK-JS-RXJS-1276031',            cve: 'CVE-2021-23305', sev: 'high',     cvss: 7.5, desc: 'Regular Expression DoS',   upgradable: true,  fixable: true,  slo: 'fail', slo_rem: -15,  intro: '2021-05-04' },
  { pkg: 'uuid',              snyk: 'SNYK-JS-UUID-9912233',            cve: 'CVE-2024-55555', sev: 'low',      cvss: 3.1, desc: 'Insecure Randomness',       upgradable: true,  fixable: false, slo: 'pass', slo_rem: 30,   intro: '2024-08-10' },
  { pkg: 'styled-components', snyk: 'SNYK-JS-STYLEDCOMPONENTS-9900001',cve: 'CVE-2024-54321', sev: 'medium',   cvss: 4.3, desc: 'Cross-site Scripting',      upgradable: false, fixable: true,  slo: 'pass', slo_rem: 5,    intro: '2024-09-15' },
  { pkg: 'enzyme',            snyk: 'SNYK-JS-ENZYME-9988771',          cve: 'CVE-2023-44444', sev: 'low',      cvss: 2.5, desc: 'Information Exposure',      upgradable: false, fixable: false, slo: 'pass', slo_rem: 60,   intro: '2023-06-01' },
  { pkg: '@emotion/react',    snyk: 'SNYK-JS-EMOTIONREACT-1122334',    cve: 'CVE-2025-11111', sev: 'medium',   cvss: 5.0, desc: 'Prototype Pollution',       upgradable: true,  fixable: true,  slo: 'pass', slo_rem: 8,    intro: '2025-01-20' },
  { pkg: 'react-router-dom',  snyk: 'SNYK-JS-REACTROUTERDOM-9873210',  cve: 'CVE-2024-98765', sev: 'high',     cvss: 8.1, desc: 'Open Redirect',             upgradable: true,  fixable: true,  slo: 'fail', slo_rem: -3,   intro: '2024-12-01' },
  { pkg: 'io-ts',             snyk: 'SNYK-JS-IOTS-0012345',            cve: 'CVE-2025-22222', sev: 'low',      cvss: 2.0, desc: 'Denial of Service',         upgradable: false, fixable: false, slo: 'pass', slo_rem: 45,   intro: '2025-02-10' },
] as const;

export async function setupSnykMockIndex(esUrl: string, apiKey: string): Promise<'created' | 'exists'> {
  const base = esUrl.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', Authorization: `ApiKey ${apiKey}` };

  // Skip if the index already exists (real data may be there).
  const check = await fetch(`${base}/${SNYK_INDEX}`, { headers });
  if (check.ok) return 'exists';

  // Create as a lookup index so ES|QL LOOKUP JOIN works.
  const mapping = {
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        '@timestamp':                       { type: 'date' },
        dep:                                { type: 'keyword' },
        'vulnerability.component_name':     { type: 'keyword' },
        'vulnerability.severity':           { type: 'keyword' },
        'vulnerability.cvssScore':          { type: 'float' },
        'vulnerability.status':             { type: 'keyword' },
        'vulnerability.slo_status':         { type: 'keyword' },
        'vulnerability.slo_remaining':      { type: 'integer' },
        'vulnerability.id':                 { type: 'keyword' },
        'vulnerability.short_description':  { type: 'keyword' },
        'vulnerability.isUpgradable':       { type: 'boolean' },
        'vulnerability.is_fixable_snyk':    { type: 'boolean' },
        'vulnerability.introducedDate':     { type: 'date' },
        snyk_id:                            { type: 'keyword' },
      },
    },
  };

  const createRes = await fetch(`${base}/${SNYK_INDEX}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(mapping),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create ${SNYK_INDEX} (${createRes.status}): ${await createRes.text()}`);
  }

  const ts = new Date().toISOString();
  const body =
    SNYK_MOCK_DOCS.flatMap((c) => [
      JSON.stringify({ index: { _index: SNYK_INDEX, _id: c.snyk } }),
      JSON.stringify({
        '@timestamp': ts,
        snyk_id: c.snyk,
        dep: c.pkg,
        'vulnerability.component_name': c.pkg,
        'vulnerability.id': c.cve,
        'vulnerability.severity': c.sev,
        'vulnerability.cvssScore': c.cvss,
        'vulnerability.status': 'open',
        'vulnerability.slo_status': c.slo,
        'vulnerability.slo_remaining': c.slo_rem,
        'vulnerability.short_description': c.desc,
        'vulnerability.isUpgradable': c.upgradable,
        'vulnerability.is_fixable_snyk': c.fixable,
        'vulnerability.introducedDate': c.intro,
      }),
    ]).join('\n') + '\n';

  const bulkRes = await fetch(`${base}/_bulk`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-ndjson' },
    body,
  });
  if (!bulkRes.ok) {
    throw new Error(`Failed to index mock Snyk docs (${bulkRes.status}): ${await bulkRes.text()}`);
  }

  return 'created';
}

// ---------------------------------------------------------------------------
// Panel builders
// ---------------------------------------------------------------------------

function panel(type: string, grid: object, config: object) {
  return {
    id: crypto.randomUUID(),
    type: 'vis',
    grid,
    config: { type, sampling: 1, ignore_global_filters: false, ...config },
  };
}

function xyPanel(
  grid: object,
  query: string,
  xCol: string,
  yCols: string[],
  { dataLabels = false, legend = 'hidden' }: { dataLabels?: boolean; legend?: string } = {}
) {
  // xy panels carry sampling/ignore_global_filters inside each layer, not at the top-level config.
  return {
    id: crypto.randomUUID(),
    type: 'vis',
    grid,
    config: {
      type: 'xy',
      layers: [
        {
          type: 'bar_stacked',
          sampling: 1,
          ignore_global_filters: false,
          data_source: { type: 'esql', query },
          x: { column: xCol },
          y: yCols.map((c) => ({ column: c, color: { type: 'auto' } })),
        },
      ],
      axis: {
        x: {
          title: { visible: true },
          ticks: { visible: true },
          grid: { visible: false },
          labels: { orientation: 'horizontal' },
          scale: 'ordinal',
          domain: { type: 'fit', rounding: false },
        },
        y: {
          title: { visible: true },
          scale: 'linear',
          ticks: { visible: true },
          grid: { visible: true },
          labels: { orientation: 'horizontal' },
          domain: { type: 'full', rounding: true },
        },
      },
      legend: {
        visibility: legend,
        placement: 'outside',
        position: 'right',
        layout: { type: 'grid', truncate: { max_lines: 1 } },
      },
      styling: {
        overlays: { partial_buckets: { visible: false }, current_time_marker: { visible: false } },
        bars: { minimum_height: 1, data_labels: { visible: dataLabels } },
      },
    },
  };
}

function buildDashboard() {
  const panels = [
    // Row 1: full-width heatmap dep × plugin
    panel('heatmap', { x: 0, y: 0, w: 48, h: 16 }, {
      data_source: {
        type: 'esql',
        query:
          'FROM kibana-dependency-usage\n' +
          '| STATS total = SUM(dependent_file_count) BY dep, plugin_name\n' +
          '| SORT total DESC\n' +
          '| LIMIT 400',
      },
      x: { column: 'dep' },
      y: { column: 'plugin_name' },
      metric: { column: 'total', color: { type: 'auto' } },
      legend: { visibility: 'visible', position: 'right' },
      axis: {
        x: { labels: { visible: true }, title: { visible: false }, scale: 'ordinal' },
        y: { labels: { visible: true }, title: { visible: false } },
      },
      styling: { cells: { labels: { visible: false } } },
    }),

    // Row 2: top 25 deps by file count | plugins by dep count
    xyPanel(
      { x: 0, y: 16, w: 24, h: 15 },
      'FROM kibana-dependency-usage\n| STATS total = SUM(dependent_file_count) BY dep\n| SORT total DESC\n| LIMIT 25',
      'dep',
      ['total'],
      { dataLabels: true }
    ),
    xyPanel(
      { x: 24, y: 16, w: 24, h: 15 },
      'FROM kibana-dependency-usage\n| STATS dep_count = COUNT(*) BY plugin_name\n| SORT dep_count DESC\n| LIMIT 30',
      'plugin_name',
      ['dep_count'],
      { dataLabels: true }
    ),

    // Row 3: renovate pie | prod vs test stacked bar
    panel('pie', { x: 0, y: 31, w: 16, h: 14 }, {
      data_source: {
        type: 'esql',
        query:
          'FROM kibana-dependency-usage\n| STATS count = COUNT(*) BY renovate_orphan',
      },
      metrics: [{ column: 'count' }],
      group_by: [
        {
          column: 'renovate_orphan',
          color: { mode: 'categorical', palette: 'default', mapping: [] },
        },
      ],
      legend: { visibility: 'auto', nested: false },
      styling: {
        labels: { visible: true, position: 'outside' },
        values: { visible: true, mode: 'percentage' },
      },
    }),
    xyPanel(
      { x: 16, y: 31, w: 32, h: 14 },
      'FROM kibana-dependency-usage\n' +
        '| STATS prod_files = SUM(dependent_prod_file_count), test_files = SUM(dependent_test_file_count) BY dep\n' +
        '| SORT prod_files DESC\n' +
        '| LIMIT 20',
      'dep',
      ['prod_files', 'test_files'],
      { legend: 'visible' }
    ),

    // Row 4: CVE detail table (LOOKUP JOIN with snyk-follower)
    panel('data_table', { x: 0, y: 45, w: 48, h: 16 }, {
      data_source: {
        type: 'esql',
        query:
          'FROM kibana-dependency-usage\n' +
          '| STATS total_files = SUM(dependent_file_count), plugin_count = COUNT_DISTINCT(plugin_name) BY dep\n' +
          '| LOOKUP JOIN snyk-follower ON dep\n' +
          '| WHERE `vulnerability.status` IS NOT NULL\n' +
          '| SORT `vulnerability.cvssScore` DESC\n' +
          '| KEEP dep, total_files, plugin_count, `vulnerability.severity`, `vulnerability.cvssScore`,\n' +
          '       `vulnerability.id`, `vulnerability.slo_status`, `vulnerability.slo_remaining`,\n' +
          '       `vulnerability.short_description`, `vulnerability.isUpgradable`',
      },
      metrics: [
        { column: 'dep' },
        { column: 'total_files' },
        { column: 'plugin_count' },
        { column: 'vulnerability.severity' },
        { column: 'vulnerability.cvssScore' },
        { column: 'vulnerability.id' },
        { column: 'vulnerability.slo_status' },
        { column: 'vulnerability.slo_remaining' },
        { column: 'vulnerability.short_description' },
        { column: 'vulnerability.isUpgradable' },
      ],
      styling: { row_numbers: { visible: true } },
    }),

    // Row 5: blast-radius bar (files exposed) | severity pie
    xyPanel(
      { x: 0, y: 61, w: 32, h: 14 },
      'FROM kibana-dependency-usage\n' +
        '| STATS total_files = SUM(dependent_file_count) BY dep\n' +
        '| LOOKUP JOIN snyk-follower ON dep\n' +
        '| WHERE `vulnerability.status` IS NOT NULL\n' +
        '| STATS max_files = MAX(total_files) BY dep, `vulnerability.severity`\n' +
        '| SORT max_files DESC',
      'dep',
      ['max_files'],
      { dataLabels: true }
    ),
    panel('pie', { x: 32, y: 61, w: 16, h: 14 }, {
      data_source: {
        type: 'esql',
        query:
          'FROM kibana-dependency-usage\n' +
          '| STATS total_files = SUM(dependent_file_count) BY dep\n' +
          '| LOOKUP JOIN snyk-follower ON dep\n' +
          '| WHERE `vulnerability.status` IS NOT NULL\n' +
          '| STATS count = COUNT(*) BY `vulnerability.severity`',
      },
      metrics: [{ column: 'count' }],
      group_by: [{ column: 'vulnerability.severity', color: { mode: 'categorical', palette: 'default', mapping: [] } }],
      legend: { visibility: 'auto', nested: false },
      styling: { labels: { visible: true, position: 'outside' }, values: { visible: true, mode: 'percentage' } },
    }),

    // Row 6: dep detail table
    panel('data_table', { x: 0, y: 75, w: 48, h: 16 }, {
      data_source: {
        type: 'esql',
        query:
          'FROM kibana-dependency-usage\n' +
          '| STATS total_files = SUM(dependent_file_count),\n' +
          '        prod_files = SUM(dependent_prod_file_count),\n' +
          '        test_files = SUM(dependent_test_file_count),\n' +
          '        plugin_count = COUNT_DISTINCT(plugin_name)\n' +
          '  BY dep, dep_declared_version, renovate_match_team, renovate_match_group, renovate_orphan\n' +
          '| SORT total_files DESC\n' +
          '| LIMIT 200',
      },
      metrics: [
        { column: 'dep' },
        { column: 'dep_declared_version' },
        { column: 'total_files' },
        { column: 'prod_files' },
        { column: 'test_files' },
        { column: 'plugin_count' },
        { column: 'renovate_match_team' },
        { column: 'renovate_match_group' },
        { column: 'renovate_orphan' },
      ],
      styling: { row_numbers: { visible: true } },
    }),
  ];

  return {
    title: 'Dependency Usage',
    panels,
    options: {
      hide_panel_titles: false,
      hide_panel_borders: false,
      use_margins: true,
      auto_apply_filters: true,
      sync_colors: false,
      sync_cursor: true,
      sync_tooltips: false,
    },
    query: { expression: '', language: 'kql' },
    pinned_panels: [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createOrUpdateDashboard(
  opts: DashboardOptions
): Promise<{ url: string; snykMock: 'created' | 'exists' | 'skipped' }> {
  const snykMock =
    opts.snykMock !== false
      ? await setupSnykMockIndex(
          opts.esUrl ?? 'https://localhost:9200',
          opts.kibanaApiKey
        )
      : 'skipped';

  const id = opts.dashboardId ?? crypto.randomUUID();
  const url = `${opts.kibanaUrl.replace(/\/$/, '')}/api/dashboards/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      Authorization: `ApiKey ${opts.kibanaApiKey}`,
    },
    body: JSON.stringify(buildDashboard()),
  });

  if (!res.ok) {
    throw new Error(`Failed to create/update dashboard (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { id: string };
  return {
    url: `${opts.kibanaUrl.replace(/\/$/, '')}/app/dashboards#/view/${json.id}`,
    snykMock,
  };
}
