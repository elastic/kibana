# Review: Adaptive UI portable chat (`adaptive-ui/portable-chat`)

**Status:** ready for review · **Base:** `main` (`3a4c4ff50db6`) · **Scope:** integrate the latest Adaptive UI into Agent Builder as a portable attachment/body renderer, with no relay.

This is a reviewer's guide: what the branch delivers, how to verify it, and how to demo it. It reflects the branch as built, and the verification results below were re-run against the final tree.

## What this branch delivers

Four commits, grouped by concern rather than by the order the work happened:

| # | Commit | What |
| --- | --- | --- |
| 1 | Vendor Adaptive UI as a single `@kbn/adaptive-ui` package | Wrap `@elastic/adaptive-ui-host-kibana` in one Kibana package; [`sync_dist.mjs`](../../src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs) vendors the upstream workspace closure into `vendor/` and rewrites `@elastic/*` specifiers to relative paths |
| 2 | Port the `adaptive_ui` plugin | The `view` renderer (server + browser), the `platform.adaptiveUi.view` attachment, the `render_view` / `get_authoring_context` / `request_registered_view` tools, the code-owned view registry, `KibanaAdaptiveView` isolation, and codeBlock grammar registration |
| 3 | Data→ViewSpec adapters | A pure `to<Type>ViewSpec` adapter plus a cross-surface golden test per pure-presentational attachment type, the shared harness, and the primitive-gap and body-seam design docs |
| 4 | Post views to Slack as Block Kit | Host href resolution, the `post_view_to_slack` tool, the `.slack2` Block Kit + file-upload support, and chart PNG rasterization |

The vendored `vendor/` tree is gitignored, not committed, so no upstream SHA lives in git history. `sync_dist.mjs` records the revision it pulled in the gitignored `src/platform/packages/shared/adaptive-ui/.vendored_upstream.json` stamp. Bootstrap a checkout by building the upstream packages (`yarn build:packages`) and running the sync once (see [`@kbn/adaptive-ui`](../../src/platform/packages/shared/adaptive-ui/README.md)); until then type-checking, tests, and the plugin cannot resolve the vendored library.

## Architecture at a glance

- **One vendored package**, [`@kbn/adaptive-ui`](../../src/platform/packages/shared/adaptive-ui): a thin wrapper over `@elastic/adaptive-ui-host-kibana`. [`scripts/sync_dist.mjs`](../../src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs) copies the upstream workspace closure into `vendor/` and rewrites `@elastic/*` specifiers to relative paths, so Kibana never tracks upstream's package graph.
- **The `adaptive_ui` plugin** (`adaptiveUi`, [`kibana.jsonc`](../../x-pack/platform/plugins/shared/adaptive_ui/kibana.jsonc)) registers three tools (`render_view`, `get_authoring_context`, `request_registered_view`), a code-owned view registry (`streams.significantEvent`), the `view` renderer on both server and browser, and the `platform.adaptiveUi.view` attachment. Allow-list entries live in [`allow_lists.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts) and [`tools/constants.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/constants.ts). Commit 4 adds `post_view_to_slack`.
- **Three registration paths** (plan §3): the `platform.adaptiveUi.view` attachment (full chrome + canvas), the `view` renderer (`<render type="view">`, no chrome), and — as a proposal only — a core seam so existing types can swap their body for a `ViewSpec` while keeping chrome. See [`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md).

## Portability: one spec, four surfaces

The durable substance is the shared harness [`cross_surface.test.helpers.tsx`](../../x-pack/platform/plugins/shared/adaptive_ui/public/renderers/cross_surface.test.helpers.tsx): each adapter's `ViewSpec` is asserted as plain text, GitHub markdown, Slack Block Kit, and the Kibana React body. This proves the spec is portable, not merely renderable in chat.

## Attachment adapters (alternate renderings)

[`common/adapters/`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters) holds a pure `to<Type>ViewSpec(data): ViewSpec` function per pure-presentational Agent Builder attachment type behind the Figma live examples, each with a realistic `sample<Type>` fixture and a cross-surface golden test. These are isomorphic (plain `@kbn/adaptive-ui/builders`, no React) and are exactly what a future `getViewSpec` seam would call — the seam ([`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md)) stays a proposal; no `agent_builder` core changes. Input types come from `@kbn/agent-builder-common` where importable (`text`, `esql`); every other type uses a local structural interface with a doc link to the source type, so the platform plugin needs no dependency on Cases, Security, Alerting, Workflows, or Streams.

### Coverage matrix (Figma type → adapter → status)

| Attachment type | Adapter | Primitives | Status |
| --- | --- | --- | --- |
| `text` | [`text.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/text.ts) | `text`(markdown) | Clean |
| `esql` | [`esql.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/esql.ts) | `codeBlock`, `text` | Clean |
| `case` | [`case.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/case.ts) | `badge`, `statGroup`, `descriptionList`, `actions` | Clean |
| `cases` | [`cases.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/cases.ts) | `itemList` | Clean |
| `security.rule` | [`security_rule.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/security_rule.ts) | `contextStrip`, `descriptionList`(node values), `codeBlock`, `badge` | Clean |
| `platform.alerting.rule` | [`alerting_rule.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/alerting_rule.ts) | `badge`, `descriptionList`, `codeBlock` | Clean |
| `platform.alerting.action_policy` | [`action_policy.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/action_policy.ts) | `badge`, `descriptionList` | Clean |
| `workflow.yaml` | [`workflow_yaml.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/workflow_yaml.ts) | `descriptionList`, `codeBlock` | Clean |
| `workflow.yaml.diff` | [`workflow_yaml_diff.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/workflow_yaml_diff.ts) | `diff` (via `diff` unified patch) | Clean |
| `platform.sig_event` | [`sig_event.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/sig_event.ts) | `badge`, `statGroup`, `panel`, `table`, `descriptionList`, `actions` | Clean (ES\|QL log evidence omitted — needs runtime query) |
| `platform.sig_event_detection` | [`sig_event_detection.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/sig_event_detection.ts) | `badge`, `descriptionList` | Clean |
| `platform.ki_feature` | [`ki_feature.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/ki_feature.ts) | `badge`, `descriptionList`, `codeBlock` | Clean |
| `skill` | [`skill.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/skill.ts) | `text`, `codeBlock`, `badge`, `itemList` | Clean (body subset) |
| `connector_setup` | [`connector_setup.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/connector_setup.ts) | `badge`, `callout` | Clean (prompt subset) |
| `security.entity_analytics_dashboard` | [`entity_analytics_dashboard.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/entity_analytics_dashboard.ts) | `statGroup`, `donut`, `table`, `itemList` | Clean |
| `security.entity_risk_score_history` | [`entity_risk_score_history.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/entity_risk_score_history.ts) | `statGroup`, `timeSeries`, `descriptionList` | Clean |
| `graph` | [`graph.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/graph.ts) | `callout`, `statGroup`, `table`, `badge` | Degraded — no graph primitive ([gap](./adaptive_ui_primitive_gaps.md)) |
| `observability.service-map` | [`service_map.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/service_map.ts) | `callout`, `statGroup`, `table`, `badge` | Degraded — no graph primitive ([gap](./adaptive_ui_primitive_gaps.md)) |

Every adapter is applied to its sample and listed in [`common/adapters/index.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/common/adapters/index.ts) as `adapterGallery`, the canonical list the demo iterates and a future seam would draw from.

**Out of scope (live-fetch types):** `security.rule.preview`, `security.entity`, `security.entity_graph`, `platform.dashboard.dashboard_state` panel data, `visualization` chart data, and the `platform.sig_event` ES|QL log rows — these need runtime data, not a static `ViewSpec`, and belong to the seam's `renderInlineContent` fallback.

## How to verify (automated)

All three were re-run against the final tree and pass. Use Node from `.nvmrc` (`v24.19.0`).

```bash
# Unit (adapter suites: `node scripts/jest … "adapter\.test"`)
node scripts/jest --config x-pack/platform/plugins/shared/adaptive_ui/jest.config.js

# Types: exits 0
node scripts/type_check --project x-pack/platform/plugins/shared/adaptive_ui/tsconfig.json

# Lint: clean
node scripts/eslint x-pack/platform/plugins/shared/adaptive_ui
```

Each adapter suite asserts that its archetype maps to a valid `ViewSpec` (`validateView`), renders across all four surfaces (text, markdown, Slack, React) without throwing, and carries the expected data into the rendered React tree. Verbatim off-Kibana output is not snapshotted — that is the upstream library's responsibility, and pinning it here only churns on every re-vendor.

## How to demo

### Offline (no stack)

[`cross_surface_demo.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts) iterates `adapterGallery` — validating and rendering every attachment adapter to markdown (and one to Slack blocks) — the "the payload is the seam" argument for every type at once, runnable without booting anything:

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts
```

### In a running Kibana (end-to-end)

Boot the stack (`yarn es snapshot`, then `yarn start`; Agent Builder is on by default in stateful dev — `xpack.agentBuilder.enabled`). Open Agent Builder (**Chat**) and paste the prompts below. Each path validates a different registration:

- **`render_view` → `platform.adaptiveUi.view` attachment.** The agent calls `render_view` with a `ViewSpec`; it validates, persists the attachment, and returns an id the agent renders with `<render_attachment id="…"/>`. Expect the spec inside the framework chrome (`EuiSplitPanel.Outer` + `AttachmentHeader`), with the canvas flyout on click. This is the production-shaped path and the one exercising the allow-list entries.
- **`request_registered_view` → same attachment, code-owned view.** Renders the curated `streams.significantEvent` view; proves the registry path.
- **`get_authoring_context`.** Returns the primitive catalog + schema the model uses to author a spec; useful to confirm the tool is allow-listed and reachable.

#### Prompts to copy/paste

All five below were exercised live against a running stack and rendered as expected (attachment card with header chrome + **Expand** canvas affordance).

**1. `render_view` — deterministic (paste the exact spec).** This bypasses model authoring so you test rendering, not the LLM. It's the `text` archetype fixture verbatim:

```text
Call the render_view tool with exactly this spec, then render the returned attachment with <render_attachment>. Do not restate the content as prose.

{"type":"view","title":"Ingest pipeline restarted","subtitle":"agent.node-2 · 12:04 UTC","body":[{"type":"text","format":"markdown","body":"Restarting the ingest pipeline cleared the backlog on `agent.node-2`. The two data nodes that were behind on indexing have caught up; monitor `logs-000042` for recurrence over the next hour."},{"type":"codeBlock","title":"Last 6 log lines","language":"log","code":"[12:03:58] WARN  ingest: queue depth 18211 exceeds soft limit\n[12:04:01] INFO  ingest: draining queue for logs-000042\n[12:04:02] INFO  ingest: pipeline \"logs-default\" restarted\n[12:04:03] INFO  ingest: queue depth 0\n[12:04:03] INFO  ingest: backlog cleared in 4.2s\n[12:04:04] INFO  ingest: steady state"}]}
```

**2. `render_view` — model-authored (tests the whole loop).** The agent calls `get_authoring_context`, authors a spec, then `render_view`s it:

```text
Render an Adaptive UI view (use the render_view tool) summarizing this incident as a card with a status badge, a short prose summary, and a table of the two signals below. Call get_authoring_context first for the primitive catalog. Render the returned attachment; do not repeat the content as text.

Incident: checkout error rate spiked 4× in eu-west-1 after the payment-service v2.4.1 deploy at 14:02 UTC.
Signals:
- Payment error rate (logs-payment-service): 5xx on POST /charge rose 0.4% → 6.1% at 14:05 UTC — anomaly
- DB connection pool utilization (metrics-payment-service): active connections pinned at 20/20 since 14:04 UTC — saturated
```

**3. `request_registered_view` — curated default.** Renders the built-in `streams.significantEvent` fixture (dropped payments on `payment-service`):

```text
Use the request_registered_view tool to render the "streams.significantEvent" view, then render the returned attachment with <render_attachment>.
```

**4. `request_registered_view` — with input overrides.** Same view, different data — proves `build({ input })` merges overrides over the fixture. Note the merge is **shallow**: fields you omit (`recommendations`, `evidences`, `cause_kis`, `stream_names`, `rule_names`) keep the payment-service fixture values, so a partial override renders a mixed card. Pass a complete input for a clean result:

```text
Use the request_registered_view tool with viewId "streams.significantEvent" and this input, then render the returned attachment:

{"event_id":"sigev-2b81d0","title":"Elevated 5xx on search-service","status":"acknowledged","criticality":58,"confidence":74,"summary":"Search error rate rose to 2.3% in us-east-1 over the last 15 minutes.","root_cause":"A slow rolling restart of search-service left two nodes unready while traffic shifted to the remaining nodes.","recommendations":["Pause the rolling restart until each node reports ready.","Shift read traffic away from the two unready nodes via shard allocation filtering."],"stream_names":["logs-search-service","metrics-search-service"],"rule_names":["Search error rate","Node readiness"],"evidences":[{"rule_name":"Search error rate","stream_name":"logs-search-service","result":"anomaly","description":"5xx on _search rose 0.3% → 2.3% at 09:12 UTC."},{"rule_name":"Node readiness","stream_name":"metrics-search-service","result":"degraded","description":"2 of 6 nodes unready since 09:10 UTC."}],"cause_kis":[{"name":"search-service rolling restart","stream_name":"metrics-search-service"}]}
```

**5. `get_authoring_context` — reachability check:**

```text
Use the get_authoring_context tool and list the Adaptive UI primitives available for authoring a view.
```

If the agent answers in prose instead of calling a tool, the tools may not be allow-listed for that agent — confirm `render_view`, `get_authoring_context`, and `request_registered_view` are enabled on the agent (they're in the default builtin set via [`tools/constants.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/constants.ts) and [`allow_lists.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts)).

## Known caveats / follow-ups

- **codeBlock syntax highlighting is React/SVG only and opt-in.** Browser start registers the default grammars over `@kbn/adaptive-ui/syntax`; text, markdown, and Slack keep plain monospace, so only the React surface carries per-token spans.
- **The body seam is a proposal, not wired.** Nothing runtime to demo for it; it is reviewed as a design doc. The honest live stand-in is a throwaway attachment type whose `renderInlineContent` mounts `AdaptiveViewContainer`.
- **The PNG surface** (`@kbn/adaptive-ui/node`) is server-only and off the chat path. It backs `post_view_to_slack`, which rasterizes chart primitives Slack has no block for and uploads them through the connector's `uploadFile` action; it is not exercised by the in-chat renderer.

## Reviewer checklist

- Vendoring: is `vendor/` gitignored (never committed), and does a fresh `sync_dist.mjs` run leave the tree clean and write the `.vendored_upstream.json` stamp? (`sync_dist.mjs`, package README.)
- Plugin: no relay residue, no `agent-builder-server` hook edits; allow-list additions match the registered tool/attachment ids.
- Renderer: `getHeader` maps spec `title`/`subtitle`; `parseViewSpec` narrows the loose schema payload rather than casting.
- Adapters: each `to<Type>ViewSpec` maps the real payload shape to real primitive nodes; each golden test covers all four surfaces via the shared harness; degraded types link the primitive-gap doc.
- Seam proposal: contract change is additive/opt-in; dependency-direction decision (shared component vs start-contract injection) is called out for the Agent Builder team.
