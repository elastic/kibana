---
name: embed-kibana-panels
description: |
  Build self-contained HTML dashboards from ES|QL queries rendered with ECharts.
  Queries Elasticsearch directly — no Kibana saved objects, no Kibana session required.
  Use when the user wants to visualize dep-usage data (or any ES index) as a local
  HTML page with heatmaps, bar charts, or tables.
---

## When to use

- Build a local analytics page over `kibana-dependency-usage` or any ES index
- Mix heatmaps, bar charts, and tables in a single self-contained HTML file
- Get a shareable/openable dashboard without needing Kibana to be running

For interactive Kibana dashboards you want to keep in Kibana — build them in the
Kibana UI directly.

## Prerequisites

```bash
export ELASTICSEARCH_URL="https://localhost:9200"   # ES base URL
export ELASTICSEARCH_API_KEY="<your-api-key>"        # ES or Kibana API key
export NODE_TLS_REJECT_UNAUTHORIZED=0               # local serverless — self-signed cert
```

Discovering env values:
- ES URL: usually `https://localhost:9200` for local serverless dev
- API key: same key used to index data, or the Kibana MCP key from `~/.claude/mcp.json`

## Workflow

1. **Write a page spec** (or reuse `page-specs/deps-heatmap.json`) describing each panel.

2. **Build the HTML page:**
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 \
   ELASTICSEARCH_API_KEY="..." \
   node scripts/build_page.mjs page-specs/deps-heatmap.json
   ```
   The script prints the output path (e.g. `tmp/dep-usage-security-plugins.html`).

3. **Open it:**
   ```bash
   open tmp/dep-usage-security-plugins.html
   ```
   The file is fully self-contained — no server needed, works offline after build.

## Page spec format

```json
{
  "title": "My Dashboard",
  "panels": [
    {
      "type": "heatmap",
      "title": "Top deps × plugins",
      "esql": "FROM kibana-dependency-usage | STATS total = SUM(dependent_file_count) BY dep, plugin_name | SORT total DESC | LIMIT 400",
      "x": "dep",
      "y": "plugin_name",
      "value": "total",
      "height": 700
    },
    {
      "type": "bar",
      "title": "Top 25 deps",
      "esql": "FROM kibana-dependency-usage | STATS total = SUM(dependent_file_count) BY dep | SORT total DESC | LIMIT 25",
      "category": "dep",
      "value": "total",
      "height": 420
    },
    {
      "type": "table",
      "title": "Dependency detail",
      "esql": "FROM kibana-dependency-usage | STATS total_files = SUM(dependent_file_count) BY dep, dep_declared_version, renovate_match_team | SORT total_files DESC | LIMIT 100",
      "columns": ["dep", "dep_declared_version", "total_files", "renovate_match_team"]
    }
  ]
}
```

### Panel types

| type | required fields | notes |
|------|----------------|-------|
| `heatmap` | `x`, `y`, `value` | cartesian heatmap; top categories ranked by value sum |
| `bar` | `category`, `value` | horizontal-ish bar; sorted by value desc |
| `table` | `columns` (optional) | scrollable table; omit `columns` for all query columns |

`height` (px, default 500) applies to chart panels; tables use fixed scroll.

## Generating ES|QL queries

Use `platform_core_generate_esql` or `platform_core_execute_esql` MCP tools to
design and validate queries before putting them in the spec. The ES|QL query
must SELECT all columns referenced by `x`/`y`/`value`/`category` in the panel spec.

## Notes

- Data is baked in at build time — refresh by re-running `build_page.mjs`
- All panels run in parallel at build time
- `LIMIT` in ES|QL caps the input rows; for heatmaps use 300–500 to cover all combinations
- ECharts loaded from CDN (`cdn.jsdelivr.net`) — needs network at build time only
