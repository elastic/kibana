# Isomer demo

Demo only. This branch is never PR'd and never pushed to `elastic/kibana`. The plan behind it is the Isomer stack reset meta plan's "Demo lane".

**The demo:** export a Kibana dashboard as a PDF drawn by Isomer, from the Dashboard share menu, with no Alembic involved. The same composition also renders as a single-column mobile view.

## Building the demo

The demo is a linear stack of `isomer/demo/*` branches on the PR lane head, the highest Isomer stack branch on `upstream`. Its top, `isomer/demo/latest`, has everything, and is the branch to check out and run. Each branch below it adds one layer:

| Branch | What it adds |
|---|---|
| `isomer/demo/components` | the `snapshot` surface the merged plugin left out (Kibana's card frame, primitives' snapshot heights, `borealisLight` and the plugin's `create_runtime.ts`), and table cell colors, column widths and legacy Markdown in the components pack |
| `isomer/demo/charts` | `@kbn/isomer-primitives-charts`, registered in the runtime |
| `isomer/demo/vega` | `@kbn/isomer-primitives-vega`, registered in the runtime, drawn as Kibana draws Vega |
| `isomer/demo/charts-engines` | the charts pack's engine hooks, the Elastic Charts engines (browser and Node), and server drawing behind `serverDraw`, with the plugin's config |
| `isomer/demo/maps` | `@kbn/isomer-primitives-maps`, with stacked EMS layers |
| `isomer/demo/drawing` | `render_dashboards.js` for Lens comparisons; `drawPng` and `drawPdf` on the `isomer` plugin's start contract; and PDFs in a worker thread |
| `isomer/demo/lowering` | `@kbn/isomer-lowering`: Lens, Vega and Maps panels planned into ES\|QL and bound to Isomer nodes |
| `isomer/demo/dashboard-pack` | `@kbn/isomer-primitives-dashboard`: the 48-column grid and a panel container, with a one-column mobile layout |
| `isomer/demo/dashboard-export` | the `isomerDashboards` plugin: **Export, PDF (Isomer)** in the Dashboard share menu, which downloads the PDF or opens the mobile view |
| `isomer/demo/render-composition` | Agent Builder's `platform.isomer.render_composition` tool, over MCP |
| `isomer/demo/render-host` | `createRenderHost`: PNGs drawn in a forked render process (charts in its main thread, no PDF, heap cap, idle exit), so Kibana's process keeps none of the drawing memory |
| `isomer/demo/latest` | this file, `ISOMER_REQUESTS.md` and the rebuild script |

To fix a layer, commit to its branch, then restack everything above it from a worktree on `isomer/demo/latest`:

```sh
scripts/isomer_demo/rebuild.sh --bootstrap
```

The script restacks the branches onto the PR lane head when it has moved, and each onto the branch below when that one changed. `rerere` is on, so a conflict resolved once stays resolved. Git can't rebase a branch checked out in another worktree, so check out only `isomer/demo/latest` while it runs. `--fork <remote>` then force-pushes every branch to your fork; the script refuses a remote that points at `elastic/kibana`.

## Setup

```sh
scripts/isomer_demo/rebuild.sh --bootstrap
yarn es snapshot --license trial
yarn start --xpack.isomer.charts.serverDraw=true
```

To run beside another stack, add `-E http.port=9220 -E transport.port=9320` to the first command, and `--server.port=5611 --elasticsearch.hosts=http://localhost:9220` to the second.

Add the **Logs**, **Flights** and **eCommerce** sample data sets in Kibana under Home, then Add data, then Sample data. With curl, the install also needs the internal-origin header:

```sh
export KIBANA=http://localhost:5601   # include the dev base path if there is one
export AUTH=elastic:changeme
for set in logs flights ecommerce; do
  curl -fsS -u "$AUTH" -H 'kbn-xsrf: 1' -H 'x-elastic-internal-origin: kibana' -X POST "$KIBANA/api/sample_data/$set"
done
```

| Sample dashboard | id |
|---|---|
| `[Logs] Web Traffic` | `edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b` |
| `[Flights] Global Flight Dashboard` | `7adfa750-4c81-11e8-b3d7-01146121b73d` |
| `[eCommerce] Revenue Dashboard` | `722b74f0-b882-11e8-a6d9-e546fe2bba5f` |

## Acceptance checks

"Done" for the demo means every check passes on `isomer/demo/latest`.

### 1. PDF from the share menu

Open `[Logs] Web Traffic`, then choose **Export**, **PDF (Isomer)**. The flyout shows a preview of the page; switching to **Mobile** makes a new one. Keep **Dashboard grid** and choose **Download PDF**: the PDF is the previewed composition, drawn again without new queries.

The PDF should show the dashboard on Kibana's grid, over the time range on screen:
- Lens charts drawn by Elastic Charts;
- Vega and Maps panels drawn;
- data tables and saved searches as Isomer tables, with Lens's column names, widths, alignment and cell or text colors;
- Markdown panels as Markdown, legacy Markdown visualizations at their saved font size and in their own stylesheet;
- panels on Kibana's recessed page background;
- a placeholder naming and linking each panel Isomer can't draw yet.

Repeat for Flights and eCommerce.

Without the UI:

```sh
for d in edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b 7adfa750-4c81-11e8-b3d7-01146121b73d 722b74f0-b882-11e8-a6d9-e546fe2bba5f; do
  curl -fsS -u "$AUTH" -H 'kbn-xsrf: 1' -H 'x-elastic-internal-origin: kibana' -H 'content-type: application/json' \
    -X POST "$KIBANA/internal/isomer_dashboards/$d/pdf" -d '{"timeRange":{"from":"now-7d","to":"now"}}' -o "$d.pdf"
done
```

**Download composition** in the same flyout saves the previewed composition, with its hints. Without the UI, POST `{}` to `$KIBANA/internal/isomer_dashboards/<id>/composition`, then POST it back to `$KIBANA/internal/isomer_dashboards/draw` with `"format": "png"` or `"pdf"` (the flyout gzips that body; a composition over 20 MB is refused).

### 2. Mobile view

In the same flyout, choose **Open mobile view**. Or choose **Mobile** as the layout and download the PDF. The view should be one column, with every panel in reading order and each chart drawn at the phone's width. To check it at 390 px, use a browser's device mode.

Without the UI:

```sh
curl -fsS -u "$AUTH" -H 'x-elastic-internal-origin: kibana' \
  "$KIBANA/isomer_dashboards/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b/view?layout=stack&width=390&from=now-7d&to=now" \
  -o logs.html && open logs.html
```

### 3. The lowering matches the converter

```sh
node scripts/jest x-pack/platform/packages/shared/isomer/isomer-lowering
```

The ported `charts-convert` plan snapshots should match byte for byte, and the new bindings (tables, Markdown, Vega, maps and `convertDashboard`) should pass.

## Known gaps

The checks above pass with these gaps. Every panel the export can't draw faithfully says why, by name, in its placeholder.

- **Dashboard controls** filter every panel with their on-screen values, but aren't drawn. The flyout warns that unsaved changes won't print.
- **Maps** lower every source as Kibana fetches it, over EMS basemaps and boundaries. They refuse H3 hexagons, joins on documents, more than 150 markers, 2,000 cells or 100 arcs, and Kibana tile-map sources. Heatmaps draw as colored geotile cells, not a blurred density. Categorical and custom palettes draw with the nearest ramp, and say so in the outcome's notes.
- **Vega map mode** follows Kibana's contract over the EMS basemap.
- **Vega data** is pruned to what the static drawing reads. Vega-Lite rows are kept whole, which is faithful but larger. A panel whose pruned data is still over 1,000,000 characters refuses.
- **Map styles**: markers draw as circles, without icons, icon orientation or label halos; by-value line color and label size draw at their defaults. The outcome's notes name each.
- **Lens data tables** don't draw `rowHeight`, summary rows or a column `font` (request 22). Tables without saved column widths fill their panel.
- **Settings coverage**: `settings_coverage.test.ts` in `isomer-lowering` lists every saved setting for data tables, legacy Markdown and map styles as applied, or as not applied with a reason.
- **Hover** never draws: tooltips and hover-only data are left out of static output by design. Results carry a `scope` so hover data can be added later.
- **Wide pages** estimate text at the 760-pixel card's width (request 13).
- **Large dashboards**: there's no request limit beyond the grid's 100 panels, and the whole composition must fit the SDK's 20,000-value input budget.

## Dev tools

- `node x-pack/platform/plugins/shared/isomer/scripts/render_dashboards.js --exports <dir> --out <dir> [--compare]` draws converted dashboards from JSON, for Lens comparisons. It isn't part of the acceptance checks.
- Agent Builder's MCP server at `/api/agent_builder/mcp` exposes `platform.isomer.render_composition`, so a client can validate and render any composition.
