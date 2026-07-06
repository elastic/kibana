# @kbn/workflow-graph-screenshot

Renders workflow YAML files to PNG screenshots **without requiring a running Kibana
server**. The package bundles the real React/EUI/ReactFlow graph component via webpack,
serves each YAML as a standalone HTML page on a local HTTP server, and drives headless
Chromium (puppeteer) to take full-viewport screenshots.

## Usage

```sh
node scripts/workflow_graph_screenshot.js --input <path> [options]
```

`--input` accepts a file, a directory, or a glob pattern:

```sh
# Directory — renders all *.yaml / *.yml files inside
node scripts/workflow_graph_screenshot.js \
  --input src/platform/plugins/shared/workflows_management/common/examples

# Single file
node scripts/workflow_graph_screenshot.js \
  --input path/to/my_workflow.yaml

# Glob
node scripts/workflow_graph_screenshot.js \
  --input "workflows/**/*.yaml"

# Multiple inputs
node scripts/workflow_graph_screenshot.js \
  --input dir_a \
  --input dir_b/specific.yaml
```

Output PNGs are written to `./workflow-graph-screenshots/` by default, alongside
a `manifest.json` summarising the run.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--input <path>` | *(required)* | File, directory, or glob. Repeatable. |
| `--output-dir <dir>` | `./workflow-graph-screenshots` | Directory for PNGs and `manifest.json`. |
| `--width <px>` | `1600` | Browser viewport width. |
| `--height <px>` | `1000` | Browser viewport height. |
| `--theme <name>` | `light` | Colour theme (`light` only for now). |
| `--transparent` | false | Transparent background (no dot-grid). |
| `--settle-ms <ms>` | `500` | Extra wait after graph is ready (for icon paint). |
| `--concurrency <n>` | `4` | Parallel browser pages. |
| `--headless <bool>` | `true` | Pass `false` to watch the browser. |
| `--chrome-executable <path>` | auto | Path to Chrome/Chromium. Auto-detected if omitted. |
| `--serve` | false | Keep the server alive after capture for manual browsing. |

## Architecture

```
scripts/workflow_graph_screenshot.js                      ← thin launcher (setup-node-env)
  └─ @kbn/workflow-graph-screenshot (this package)
       └─ src/cli.ts                                      ← @kbn/dev-cli-runner flags + validation
            └─ src/render_workflows.ts                    ← orchestrator
                 ├─ src/build_browser_bundle.ts           ← webpack once → _bundle/bundle.js
                 ├─ src/dev_server.ts                     ← local http server (port 0)
                 │    └─ src/page_template.ts             ← HTML page injecting YAML + config globals
                 └─ puppeteer: page per YAML              ← waitForFunction(__GRAPH_READY__) → screenshot
```

The browser bundle (`src/browser_entry.tsx`) renders
`WorkflowGraphCanvasWithoutProvider` from `@kbn/workflows-ui` wrapped in an
`EuiProvider` and a `ReactFlowProvider`. The `onReady` callback sets
`window.__GRAPH_READY__ = true` once React Flow has initialised and fitted the
view — puppeteer waits for this signal before capturing.

## Chrome detection

The script tries Chrome executables in order:

1. `--chrome-executable` override
2. Puppeteer's bundled "Chrome for Testing" (if installed)
3. System Chrome / Chromium at common paths

If nothing is found you will see an error with install instructions:

```
npx puppeteer browsers install chrome
```

## Caveats

### Icon lazy-loading

EUI step icons are loaded asynchronously. With the default `--settle-ms 500`
they typically appear by the time the screenshot is taken. If you see generic
placeholder icons, increase `--settle-ms`:

```sh
node scripts/workflow_graph_screenshot.js --input ... --settle-ms 1000
```

### Bundle build time

The first run builds the browser bundle (~5–8 MB, unminified for speed). This
adds ~30–60 s of startup. The bundle is cached in the package's
`target/webpack_bundle/` directory (gitignored) and reused on subsequent runs.

### Large graphs and zoom

The canvas uses `fitView` so the entire graph is visible. Wide parallel graphs
will appear small. Increase `--width` and/or `--height` for more detail:

```sh
node scripts/workflow_graph_screenshot.js \
  --input icon_showcase.yaml \
  --width 3840 --height 2160
```

## Tests

```sh
node scripts/jest \
  src/platform/packages/private/kbn-workflow-graph-screenshot/src/render_workflows.test.ts
```
