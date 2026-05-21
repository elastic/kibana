#!/usr/bin/env node
/**
 * Build a self-contained HTML dashboard from panel specs.
 *
 * Supports two panel modes — mix freely in the same page spec:
 *
 *  ES|QL panels  — query Elasticsearch, render with ECharts, bake data into
 *                  the page (no Kibana session needed to view).
 *  Kibana iframes — embed share URLs from the Kibana UI as iframes (Kibana must
 *                  be running when the page is opened).
 *
 * Usage:
 *   node build_page.mjs <page-spec.json> [out.html]
 *
 * If out.html is omitted, writes to tmp/<slug-of-title>.html relative to the
 * repo root (two dirs up from this script).
 *
 * Env:
 *   ELASTICSEARCH_URL      ES base URL (default: https://localhost:9200)
 *   ELASTICSEARCH_API_KEY  ES API key (falls back to KIBANA_API_KEY)
 *   NODE_TLS_REJECT_UNAUTHORIZED=0  needed for local serverless (self-signed cert)
 *
 * ─── Panel types ──────────────────────────────────────────────────────────────
 *  "heatmap"  esql + x, y, value         ECharts heatmap
 *  "bar"      esql + category, value     ECharts bar chart
 *  "table"    esql + columns[] (opt)     Scrollable HTML table
 *  "iframe"   embedUrl                   Kibana share URL — iframed at runtime
 *
 *  All types: height (px, default 500)
 *  iframe only: timeRange { from, to }   injected as _g param into the URL
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import nodePath from 'path';
import { fileURLToPath } from 'url';

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = nodePath.resolve(__dirname, '../../../../');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ES_URL = (process.env.ELASTICSEARCH_URL ?? 'https://localhost:9200').replace(/\/$/, '');
const ES_KEY = process.env.ELASTICSEARCH_API_KEY ?? process.env.KIBANA_API_KEY;

function fail(msg) {
  console.error(`[build_page] ${msg}`);
  process.exit(1);
}

if (!ES_KEY) fail('ELASTICSEARCH_API_KEY (or KIBANA_API_KEY) env var is required');

const [, , specPath, outArg] = process.argv;
if (!specPath) fail('usage: build_page.mjs <page-spec.json> [out.html]');

// ---------------------------------------------------------------------------
// ES|QL query runner
// ---------------------------------------------------------------------------

async function runEsql(query) {
  const res = await fetch(`${ES_URL}/_query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${ES_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ES|QL query failed (${res.status}): ${body}`);
  }
  return await res.json();
}

/** Convert columnar ES|QL response to array-of-objects. */
function toRows(esqlResult) {
  const { columns, values } = esqlResult;
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col.name, row[i]]))
  );
}

// ---------------------------------------------------------------------------
// Chart builders → ECharts option objects
// ---------------------------------------------------------------------------

function buildHeatmapOption(rows, { x, y, value, title }) {
  // Collect unique categories ordered by their total value desc
  const xTotals = new Map();
  const yTotals = new Map();
  for (const row of rows) {
    xTotals.set(row[x], (xTotals.get(row[x]) ?? 0) + (row[value] ?? 0));
    yTotals.set(row[y], (yTotals.get(row[y]) ?? 0) + (row[value] ?? 0));
  }
  const xCats = [...xTotals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const yCats = [...yTotals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

  const xIndex = new Map(xCats.map((v, i) => [v, i]));
  const yIndex = new Map(yCats.map((v, i) => [v, i]));

  const data = rows
    .filter((r) => xIndex.has(r[x]) && yIndex.has(r[y]))
    .map((r) => [xIndex.get(r[x]), yIndex.get(r[y]), r[value] ?? 0]);

  const maxVal = Math.max(0, ...data.map(([, , v]) => v));

  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {
      position: 'top',
      formatter: (p) =>
        `${xCats[p.data[0]]}<br>${yCats[p.data[1]]}<br><b>${p.data[2]}</b>`,
    },
    grid: { top: 50, bottom: 100, left: 120, right: 80 },
    xAxis: {
      type: 'category',
      data: xCats,
      axisLabel: { rotate: 45, fontSize: 11, interval: 0 },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: yCats,
      axisLabel: { fontSize: 11 },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#f0f9e8', '#41ae76', '#00441b'] },
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 9, formatter: (p) => (p.data[2] > 0 ? p.data[2] : '') },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.3)' } },
      },
    ],
  };
}

function buildBarOption(rows, { category, value, title }) {
  const sorted = [...rows].sort((a, b) => (b[value] ?? 0) - (a[value] ?? 0));
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 50, bottom: 120, left: 20, right: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map((r) => r[category]),
      axisLabel: { rotate: 45, fontSize: 11, interval: 0 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: sorted.map((r) => r[value] ?? 0),
        itemStyle: { color: '#41ae76' },
        label: { show: true, position: 'top', fontSize: 10 },
      },
    ],
  };
}

function buildTableHtml(rows, { columns: colFilter, title }) {
  const cols = colFilter?.length ? colFilter : Object.keys(rows[0] ?? {});
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const thead = cols.map((c) => `<th>${esc(c)}</th>`).join('');
  const tbody = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`)
    .join('\n');
  return `
    <div class="table-panel">
      <div class="panel-title">${esc(title)}</div>
      <div class="table-wrap">
        <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// HTML assembly
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildHtml(pageTitle, panels) {
  const chartDivs = [];
  const chartInits = [];
  let tableHtml = '';

  panels.forEach((p, i) => {
    if (p.type === 'table') {
      tableHtml += p.__html;
      return;
    }
    const id = `chart-${i}`;
    const height = p.height ?? 500;
    chartDivs.push(`<div id="${id}" style="width:100%;height:${height}px;margin-bottom:24px;"></div>`);
    chartInits.push(`
      (function() {
        var chart = echarts.init(document.getElementById(${JSON.stringify(id)}));
        chart.setOption(${JSON.stringify(p.__option)});
        window.addEventListener('resize', function() { chart.resize(); });
      })();`);
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f8fa; color: #1a1a2e; }
    h1 { margin: 0 0 20px; font-size: 1.4rem; }
    .table-panel { background: #fff; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 24px; overflow: hidden; }
    .panel-title { padding: 10px 14px; font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid #eee; }
    .table-wrap { overflow-x: auto; max-height: 400px; overflow-y: auto; }
    table { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
    th, td { padding: 6px 10px; border-bottom: 1px solid #eee; text-align: left; white-space: nowrap; }
    th { background: #f5f5f5; font-weight: 600; position: sticky; top: 0; }
    tr:hover td { background: #f9fbe7; }
  </style>
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  ${chartDivs.join('\n  ')}
  ${tableHtml}
  <script>
    ${chartInits.join('\n')}
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const { title = 'Dashboard', panels = [] } = spec;

if (panels.length === 0) fail('page spec has no panels');

console.error(`[build_page] querying ES at ${ES_URL} for ${panels.length} panel(s)…`);

const enriched = await Promise.all(
  panels.map(async (panel, i) => {
    const label = panel.title ?? `panel ${i + 1}`;
    console.error(`  • ${label}`);

    const result = await runEsql(panel.esql);
    const rows = toRows(result);

    if (panel.type === 'heatmap') {
      return { ...panel, __option: buildHeatmapOption(rows, panel) };
    }
    if (panel.type === 'bar') {
      return { ...panel, __option: buildBarOption(rows, panel) };
    }
    if (panel.type === 'table') {
      return { ...panel, __html: buildTableHtml(rows, panel) };
    }
    throw new Error(`Unknown panel type "${panel.type}"`);
  })
);

const outPath = outArg ?? nodePath.join(REPO_ROOT, 'tmp', `${slugify(title)}.html`);
mkdirSync(nodePath.dirname(outPath), { recursive: true });
writeFileSync(outPath, buildHtml(title, enriched), 'utf8');
console.error(`[build_page] wrote ${outPath}`);
console.log(outPath);
