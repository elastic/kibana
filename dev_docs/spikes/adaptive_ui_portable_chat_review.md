# Review: Adaptive UI portable chat (`adaptive-ui/portable-chat`)

**Status:** ready for review · **Base:** `main` (`3a4c4ff50db6`) · **Scope:** integrate the latest Adaptive UI into Agent Builder as a portable attachment/body renderer, with Nightshift as the in-product demo surface and no Adaptive UI → Relay coupling.

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

Nightshift is the in-product demo: event flyout hrefs, the `nightshift.investigation` registered view, investigations GET returning `state`, and `RelayClient.trigger` forwarding Block Kit. See [Nightshift](#nightshift).

## Architecture at a glance

- **One vendored package**, [`@kbn/adaptive-ui`](../../src/platform/packages/shared/adaptive-ui): a thin wrapper over `@elastic/adaptive-ui-host-kibana`. [`scripts/sync_dist.mjs`](../../src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs) copies the upstream workspace closure into `vendor/` and rewrites `@elastic/*` specifiers to relative paths, so Kibana never tracks upstream's package graph.
- **The `adaptive_ui` plugin** (`adaptiveUi`, [`kibana.jsonc`](../../x-pack/platform/plugins/shared/adaptive_ui/kibana.jsonc)) registers four tools (`render_view`, `get_authoring_context`, `request_registered_view`, `post_view_to_slack`), a code-owned view registry (`streams.significantEvent`, `nightshift.investigation`), the `view` renderer on both server and browser, and the `platform.adaptiveUi.view` attachment. Allow-list entries live in [`allow_lists.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts) and [`tools/constants.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/constants.ts).
- **Three registration paths** (plan §3): the `platform.adaptiveUi.view` attachment (full chrome + canvas), the `view` renderer (`<render type="view">`, no chrome), and — as a proposal only — a core seam so existing types can swap their body for a `ViewSpec` while keeping chrome. See [`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md).

## Portability: one spec, four surfaces

The durable substance is the shared harness [`cross_surface.test.helpers.tsx`](../../x-pack/platform/plugins/shared/adaptive_ui/public/renderers/cross_surface.test.helpers.tsx): each adapter's `ViewSpec` is asserted as plain text, GitHub markdown, Slack Block Kit, and the Kibana React body. This proves the spec is portable, not merely renderable in chat.

## Attachment adapters (alternate renderings)

[`/adaptive-ui-adapters`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src) holds a pure `to<Type>ViewSpec(data): ViewSpec` function per pure-presentational Agent Builder attachment type behind the Figma live examples, each with a realistic `sample<Type>` fixture and a cross-surface golden test. These are isomorphic (plain `@kbn/adaptive-ui/builders`, no React) and are exactly what a future `getViewSpec` seam would call — the seam ([`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md)) stays a proposal; no `agent_builder` core changes. Input types come from `@kbn/agent-builder-common` where importable (`text`, `esql`); every other type uses a local structural interface with a doc link to the source type, so the platform plugin needs no dependency on Cases, Security, Alerting, Workflows, or Streams.

### Coverage matrix (Figma type → adapter → status)

| Attachment type | Adapter | Primitives | Status |
| --- | --- | --- | --- |
| `text` | [`text.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/text.ts) | `text`(markdown) | Clean |
| `esql` | [`esql.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/esql.ts) | `codeBlock`, `text` | Clean |
| `case` | [`case.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/case.ts) | `badge`, `statGroup`, `descriptionList`, `actions` | Clean |
| `cases` | [`cases.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/cases.ts) | `itemList` | Clean |
| `security.rule` | [`security_rule.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/security_rule.ts) | `contextStrip`, `descriptionList`(node values), `codeBlock`, `badge` | Clean |
| `platform.alerting.rule` | [`alerting_rule.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/alerting_rule.ts) | `badge`, `descriptionList`, `codeBlock` | Clean |
| `platform.alerting.action_policy` | [`action_policy.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/action_policy.ts) | `badge`, `descriptionList` | Clean |
| `workflow.yaml` | [`workflow_yaml.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/workflow_yaml.ts) | `descriptionList`, `codeBlock` | Clean |
| `workflow.yaml.diff` | [`workflow_yaml_diff.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/workflow_yaml_diff.ts) | `diff` (via `diff` unified patch) | Clean |
| `platform.sig_event` | [`sig_event.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event.ts) | `badge`, `statGroup`, `panel`, `table`, `descriptionList`, `actions` | Clean (ES\|QL log evidence omitted — needs runtime query). Primary CTA is `/app/nightshift?eventId=…` (`eventUuid` when present). |
| `nightshift.investigation` | [`investigation.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/investigation.ts) | `badge`, `panel`, `itemList`, `codeBlock`, `table`, `actions` | Clean. Registered view. Maps structured `recommendations`, `blind_spots`, and prose `conclusion`. |
| `platform.sig_event_detection` | [`sig_event_detection.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event_detection.ts) | `badge`, `descriptionList`, `codeBlock` | Clean (optional `esql_query`) |
| `platform.ki_feature` | [`ki_feature.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/ki_feature.ts) | `badge`, `descriptionList`, `codeBlock` | Clean |
| `skill` | [`skill.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/skill.ts) | `text`, `codeBlock`, `badge`, `itemList` | Clean (body subset) |
| `connector_setup` | [`connector_setup.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/connector_setup.ts) | `badge`, `callout` | Clean (prompt subset) |
| `security.entity_analytics_dashboard` | [`entity_analytics_dashboard.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/entity_analytics_dashboard.ts) | `statGroup`, `donut`, `table`, `itemList` | Clean |
| `security.entity_risk_score_history` | [`entity_risk_score_history.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/entity_risk_score_history.ts) | `statGroup`, `timeSeries`, `descriptionList` | Clean |
| `graph` | [`graph.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/graph.ts) | `callout`, `statGroup`, `table`, `badge` | Degraded — no graph primitive ([gap](./adaptive_ui_primitive_gaps.md)) |
| `observability.service-map` | [`service_map.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/service_map.ts) | `callout`, `statGroup`, `table`, `badge` | Degraded — no graph primitive ([gap](./adaptive_ui_primitive_gaps.md)) |

Every adapter is applied to its sample and listed in [`index.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/index.ts) as `adapterGallery`, the canonical list the demo iterates and a future seam would draw from.

**Out of scope (live-fetch types):** `security.rule.preview`, `security.entity`, `security.entity_graph`, `platform.dashboard.dashboard_state` panel data, `visualization` chart data, and the `platform.sig_event` ES|QL log rows — these need runtime data, not a static `ViewSpec`, and belong to the seam's `renderInlineContent` fallback.

## How to verify (automated)

These were re-run against the final tree and pass. Use Node from `.nvmrc` (`v24.19.0`).

```bash
# Unit (adapter suites: `node scripts/jest … "adapter\.test"`)
node scripts/jest --config x-pack/platform/plugins/shared/adaptive_ui/jest.config.js

# Types: exits 0
node scripts/type_check --project x-pack/platform/plugins/shared/adaptive_ui/tsconfig.json

# Lint: clean
node scripts/eslint x-pack/platform/plugins/shared/adaptive_ui

# Nightshift GET `state` + RelayClient.trigger(blocks)
node scripts/jest --config x-pack/solutions/observability/plugins/nightshift_investigations/jest.config.js
node scripts/jest x-pack/platform/plugins/shared/actions/server/lib/relay/relay_client.test.ts
```

Each adapter suite asserts that its archetype maps to a valid `ViewSpec` (`validateView`), renders across all four surfaces (text, markdown, Slack, React) without throwing, and carries the expected data into the rendered React tree. Verbatim off-Kibana output is not snapshotted — that is the upstream library's responsibility, and pinning it here only churns on every re-vendor.

## How to demo

Adaptive UI does not fetch. Chat demos 1–5 and 10–11 prove registration with fixture data. Slack posting, live ES|QL, and live Nightshift compose (prompts 6–9, 12–13) sit on top of that: a `.slack2` connector, Agent Builder's `platform.core.*` ES|QL tools, and `GET /internal/nightshift/investigations/{id}` feeding a `ViewSpec` into `render_view` / `request_registered_view` / `post_view_to_slack`.

### Offline (no stack)

[`cross_surface_demo.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts) iterates `adapterGallery` — validating and rendering every attachment adapter to markdown (and one to Slack blocks) — the "the payload is the seam" argument for every type at once, runnable without booting anything:

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts
```

[`post_to_slack_demo.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts) posts an archetype `ViewSpec` (`text`, `cases`, `security.rule`, `streams.significantEvent`, or `nightshift.investigation`) straight to `chat.postMessage`. It bypasses the agent and the connector, so it does **not** rasterize charts — use the in-product tool (prompts 6–7) for PNG upload. `--dry-run` prints the Block Kit body with no token:

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype nightshift.investigation --dry-run

# live post (bot needs `chat:write`; invite it to the channel first)
SLACK_BOT_TOKEN=xoxb-… SLACK_CHANNEL=C012AB3CD \
  node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype nightshift.investigation
```

### In a running Kibana — chat

Boot the stack (`yarn es snapshot`, then `yarn start`; Agent Builder is on by default in stateful dev — `xpack.agentBuilder.enabled`). Open Agent Builder (**Chat**) and paste the prompts below. Each path validates a different registration:

- **`render_view` → `platform.adaptiveUi.view` attachment.** The agent calls `render_view` with a `ViewSpec`; it validates, persists the attachment, and returns an id the agent renders with `<render_attachment id="…"/>`. Expect the spec inside the framework chrome (`EuiSplitPanel.Outer` + `AttachmentHeader`), with the canvas flyout on click. This is the production-shaped path and the one exercising the allow-list entries.
- **`request_registered_view` → same attachment, code-owned view.** Renders the curated `streams.significantEvent` or `nightshift.investigation` view; proves the registry path.
- **`get_authoring_context`.** Returns the primitive catalog + schema the model uses to author a spec; useful to confirm the tool is allow-listed and reachable.

#### Prompts 1–5 (fixture data)

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

Expect the dropped-payments fixture. Expand the canvas and confirm **View in Nightshift** points at `/app/nightshift`.

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

### In a running Kibana — Slack

`post_view_to_slack` is the in-product path: it renders Block Kit through the Slack (v2) connector's `sendMessage`, and rasterizes chart primitives to PNG through `uploadFile`. It is gated on Agent Builder experimental features and marked destructive. The offline script above does not exercise this.

**Setup (once):**

1. **Enable experimental features.** Stack Management → Advanced Settings → `Elastic Agent Builder: Experimental Features` (`agentBuilder:experimentalFeatures`) → On. Without this the tool reports unavailable.
2. **Create a Slack (v2) connector** (Slack API / Web API, not the incoming-webhook type). Scopes: `chat:write` required; `files:write` required for chart images (otherwise charts fall back to text). Invite the bot to the target channel.
3. **Add that connector to the agent** you're chatting with (Agent → Connectors). A connector attachment appears in the conversation with the Connector ID and sub-actions (`listChannels`, `resolveChannelId`, `sendMessage`).
4. **Allow Slack hosts** if `xpack.actions.allowedHosts` is not `*`: include both `slack.com` and `files.slack.com`. Chart bytes go to a different host than the API.
5. Confirm `post_view_to_slack` is enabled on the agent (same builtin allow-list as the other Adaptive UI tools).

Relative `href`s in the spec are rewritten to `server.publicBaseUrl` (or `getServerInfo` + the current space) before posting. On a local stack those URLs are `http://localhost:5601/…` unless you set `server.publicBaseUrl`.

**6. `post_view_to_slack` — existing chat attachment.** Run prompt 1 first so a `platform.adaptiveUi.view` attachment exists, then:

```text
Post the Adaptive UI view from this conversation to Slack. Use post_view_to_slack with the view's attachmentId. Resolve the Slack (v2) connector ID from the connector attachment, and resolve the channel ID with listChannels (or resolveChannelId) for a channel the bot is in. Do not invent a connector or channel id. After it posts, tell me the channel and message ts; do not restate the view as prose.
```

Expect a native Block Kit card in Slack that matches the chat attachment (not a blob of markdown), and a tool result with `{ channel, ts, blocks, title }`.

**7. `post_view_to_slack` — inline spec with a chart.** Slack has no chart block; this is the PNG-upload path. `files:write` must be on the bot or the donut degrades to text:

```text
Post this Adaptive UI view to Slack with post_view_to_slack, using an inline spec (not an attachment). Resolve the Slack (v2) connector ID from the connector attachment and the channel ID with listChannels. Do not invent ids.

{"type":"view","title":"Entity risk","subtitle":"Last 24 hours","body":[{"type":"statGroup","label":"Entities by risk level","stats":[{"label":"Critical","value":"5","tone":"danger"},{"label":"High","value":"12","tone":"risk"},{"label":"Medium","value":"34","tone":"warning"}]},{"type":"donut","label":"Risk distribution","segments":[{"label":"Critical","value":5,"tone":"danger"},{"label":"High","value":12,"tone":"risk"},{"label":"Medium","value":34,"tone":"warning"},{"label":"Low","value":88,"tone":"success"}]}]}
```

Expect an `image` block whose `slack_file` id came from `uploadFile`, not a leftover placeholder ref. If rasterize or upload fails, the tool re-renders without asset collection and the donut becomes text rather than posting a broken image.

### In a running Kibana — real data

Nothing in this branch queries Elasticsearch. Adapters and the `streams.significantEvent` registry take already-shaped payloads. The live loop is Agent Builder data tools → a `ViewSpec` the model authors from those rows → `render_view` (and optionally `post_view_to_slack`).

**Setup:** Home → **Sample data** → **Sample web logs** (creates `kibana_sample_data_logs`). The other sample sets (`ecommerce`, `flights`) work the same. A snapshot with no data will make `execute_esql` return empty rows; the view should then be an honest empty state, not invented numbers.

**8. ES|QL → `render_view`.** Exercises `platform.core.list_indices` / `platform.core.generate_esql` / `platform.core.execute_esql` composing into Adaptive UI:

```text
List available indices. If kibana_sample_data_logs (or any logs index) exists, generate and execute an ES|QL query over the last 24 hours that returns a count of documents grouped by a useful field (response code, dataset, or host — whatever the mapping supports). Then render an Adaptive UI view of those real rows: a title, a stat group of totals, and a table of the grouped counts. Call get_authoring_context before composing the spec. Use render_view, then render the returned attachment with <render_attachment>. Do not invent rows. Do not restate the view as prose.
```

Success is an attachment whose stats/table match the ES|QL result from that turn (spot-check one number). Failure modes worth watching: the agent restates the table as markdown instead of calling `render_view`; or it fabricates a spec without executing a query.

**9. Live query → Slack.** Same compose, off-Kibana. Requires the Slack setup from the previous section. Run after 8 so the attachment already exists, or let the agent query then post in one turn:

```text
Using the Adaptive UI view you just rendered (or query sample web logs with ES|QL and render_view first if there isn't one), post it to Slack with post_view_to_slack. Resolve the Slack (v2) connector ID from the connector attachment and the channel ID with listChannels. Do not invent ids. After it posts, tell me the channel and message ts.
```

**Optional, if this stack has Streams significant events:** `platform.sig_events.event_search` then `request_registered_view` with `viewId` `streams.significantEvent` and the event as `input`. A fresh `yarn es snapshot` has none, so skip this unless you already have events. The merge is shallow — pass a complete event payload or the fixture fields you omit will leak through.

## Nightshift

Nightshift is the in-product consumer: a significant event, an investigation, and a Slack channel the on-call already connected. Adaptive UI does not fetch. The agent composes Nightshift data into a registered view; `post_view_to_slack` executes whichever `.slack2` connector is on the agent.

Event cards (`streams.significantEvent` / `platform.sig_event`) primary-link to `/app/nightshift?eventId=…` (`eventUuid` when present), with **Open in Streams** as a fallback. Investigation cards (`nightshift.investigation`) render conclusion, ranked remediations (optional `code` as `codeBlock`), blind spots, and evidence. `GET /internal/nightshift/investigations/{id}` returns `state` (the investigate step's `structured_output`) plus a derived `conclusions` string — enough to call `toInvestigationViewSpec` with no second fetch into workflow internals.

Nightshift **Open in chat** mounts the existing `platform.sig_event` React attachment. Adaptive UI appears when the agent calls `request_registered_view` / `render_view`. The investigation card has no charts; prompt 7 (PNG upload) uses a token `.slack2` with `files:write`.

The Elastic Slack app is a managed `.slack2` (`authType: relay`) from Significant Events settings ([#286929](https://github.com/elastic/kibana/pull/286929)). That connector is not in this tree. `RelayClient.trigger` forwards `blocks` on `POST /v1/trigger`; `post_view_to_slack` does not talk to Relay — it uses `sendMessage({ text, blocks, threadTs })`. Prompts 12–13 post through a token `.slack2` the same way as prompts 6–7.

### Setup (once)

1. **A stack with significant events.** A fresh `yarn es snapshot` has none. Use a Nightshift demo environment, or seed events (Nightshift's `scripts/seed_nightshift_helpers.py`) so `/app/nightshift` lists at least one event, ideally with a completed investigation for prompt 13.
2. **Nightshift is available.** Direct-visit `/app/nightshift`. If it redirects to Observability overview, Significant Events is gated off (`GET /internal/significant_events/availability`).
3. **Agent Builder experimental features** — same as prompt 6: `agentBuilder:experimentalFeatures` On, so `post_view_to_slack` is available.
4. **A `.slack2` connector on the agent.** Token connector (prompts 6–7) works for Block Kit. For the Elastic Slack app: Streams → Significant Events → settings (`streams.significantEventsAppsEnabled` + `xpack.actions.relay.url`), finish OAuth, bind the on-call channel, and add that managed connector to the agent. `listChannels` then returns only connected channels; unbound channels `403`.
5. **`server.publicBaseUrl`** so Slack "View in Nightshift" is clickable off-laptop. On a local stack without it, hrefs absolutize to `http://localhost:5601/app/nightshift?eventId=…`.

### Offline (no stack)

Dry-run prints Block Kit with remediations, blind spots, and a Nightshift href — no token, no Relay. `cross_surface_demo.ts` iterates the investigation adapter via `adapterGallery`.

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype nightshift.investigation --dry-run
```

### In a running Kibana — chat (fixture)

Open Agent Builder (**Chat**), or from a Nightshift event flyout use **Open in chat** and then paste the prompts (the attached `platform.sig_event` is context for the model; it is not the Adaptive UI body).

**10. `request_registered_view` — event card.** Same registry path as prompt 3; confirm the primary action is `/app/nightshift?eventId=…` (`eventUuid` when present):

```text
Use the request_registered_view tool to render the "streams.significantEvent" view, then render the returned attachment with <render_attachment>. Do not restate the view as prose.
```

Expect the dropped-payments fixture card. Expand the canvas and confirm **View in Nightshift** points at `/app/nightshift`.

**11. `request_registered_view` — investigation card.** Expect conclusion, ranked remediations (optional code as `codeBlock`), blind spots, and evidence — not a markdown dump of `conclusion`:

```text
Use the request_registered_view tool to render the "nightshift.investigation" view, then render the returned attachment with <render_attachment>. Do not restate the view as prose.
```

If the agent answers in prose, confirm `request_registered_view` is allow-listed and `nightshift.investigation` is registered (same builtin path as `streams.significantEvent`).

### In a running Kibana — Slack

Run prompt 11 first so a `platform.adaptiveUi.view` attachment exists. Resolve the connector id from the connector attachment on the agent and the channel with `listChannels` / `resolveChannelId`. Prefer the Elastic Slack app instance when it is present; otherwise use the token `.slack2` from prompt 6. Do not invent ids.

**12. `post_view_to_slack` — investigation card to the on-call channel.**

```text
Post the Adaptive UI view from this conversation to Slack. Use post_view_to_slack with the view's attachmentId. Resolve the Slack (v2) connector ID from the connector attachment, preferring the Elastic Slack app connector created when this deployment connected Slack from Significant Events settings. Resolve the channel ID with listChannels for a connected channel. Do not invent a connector or channel id. After it posts, tell me the channel and message ts; do not restate the view as prose.
```

Expect a native Block Kit card matching the chat attachment (not markdown). Tool result `{ channel, ts, blocks, title }`. Click **View in Nightshift**: it should open `/app/nightshift?eventId=…` (and `eventUuid` when the fixture has it) onto the same flyout. If Slack shows plain text with no blocks, `sendMessage` did not carry `blocks` (or the agent picked a connector that cannot). Do not run prompt 7 against the Elastic Slack app — Relay has no `uploadFile` / `files:write`; a donut would fall back to text.

### In a running Kibana — live investigation

Needs a completed investigation on this stack. Adaptive UI does not call Nightshift: the agent reads `GET /internal/nightshift/investigations/{id}` (or the list route, then get) and passes `state` as `input` to `request_registered_view`. The adapter maps structured `recommendations`, `blind_spots`, and prose `conclusion`. If the investigate step emits markdown `conclusion` / `gaps_found`, the card will not scrape remediations out of that markdown — prompt 11 (fixture) is the honest card in that case.

**13. Live compose → chat → Slack.**

```text
Find the latest completed Nightshift investigation for a significant event. GET its structured state (summary, conclusion, recommendations, blind_spots, hypotheses/evidence) — do not scrape markdown out of the conclusion. Pass that state as input to request_registered_view with viewId "nightshift.investigation". Render the returned attachment with <render_attachment>. Then post it to Slack with post_view_to_slack using the Slack connector and a connected channel, as in the previous turn. Do not invent findings. After it posts, tell me the channel, message ts, and the Nightshift event id.
```

Success is a Slack card whose remediations and evidence match the Nightshift flyout for that event, and whose primary button opens that flyout. Spot-check one recommendation title and one evidence row against `/app/nightshift?eventId=…`. Failure modes: the agent restates the investigation as markdown instead of `request_registered_view`; it fabricates `input` instead of using GET; shallow merge leaks fixture fields because `input` was partial; the channel is not bound (`403`).

A fresh snapshot with no events cannot run 13. Prompts 10–12 demo the portable card.

## Known caveats / follow-ups

- **codeBlock syntax highlighting is React/SVG only and opt-in.** Browser start registers the default grammars over `@kbn/adaptive-ui/syntax`; text, markdown, and Slack keep plain monospace, so only the React surface carries per-token spans.
- **The body seam is a proposal, not wired.** Nothing runtime to demo for it; it is reviewed as a design doc. The honest live stand-in is a throwaway attachment type whose `renderInlineContent` mounts `AdaptiveViewContainer`.
- **The PNG surface** (`@kbn/adaptive-ui/node`) is server-only and off the chat path. It backs `post_view_to_slack` (prompt 7): chart primitives Slack has no block for are rasterized and uploaded through the connector's `uploadFile`. The in-chat renderer and the offline `post_to_slack_demo` script never hit it.
- **Live data is compose, not a fetch inside Adaptive UI.** There is no runtime resolver that turns an ES|QL response into a `ViewSpec`; the model is the adapter. Prompt 8 is the honest demo of that until a `getViewSpec` seam lands.
- **Live investigation `state` is a passthrough of `structured_output`.** `toInvestigationViewSpec` maps structured `recommendations` / `blind_spots` / prose `conclusion`. A markdown-shaped investigate step will not fill remediations or blind spots on the card.
- **The Elastic Slack app connector is not in this tree** ([#286929](https://github.com/elastic/kibana/pull/286929)). `RelayClient.trigger` forwards `blocks`; prompts 12–13 use a token `.slack2`. Relay has no `files:write` — charts use the token connector.

## Reviewer checklist

- Vendoring: is `vendor/` gitignored (never committed), and does a fresh `sync_dist.mjs` run leave the tree clean and write the `.vendored_upstream.json` stamp? (`sync_dist.mjs`, package README.)
- Plugin: no relay residue, no `agent-builder-server` hook edits; allow-list additions match the registered tool/attachment ids.
- Renderer: `getHeader` maps spec `title`/`subtitle`; `parseViewSpec` narrows the loose schema payload rather than casting.
- Adapters: each `to<Type>ViewSpec` maps the real payload shape to real primitive nodes; each golden test covers all four surfaces via the shared harness; degraded types link the primitive-gap doc.
- Slack: `post_view_to_slack` is experimental-gated; Block Kit goes through `.slack2` `sendMessage`; charts go through `uploadFile` with a text fallback on failure; `files.slack.com` is called out next to `slack.com`. `RelayClient.trigger` forwards `blocks` on `POST /v1/trigger`; the managed Elastic Slack app connector is [#286929](https://github.com/elastic/kibana/pull/286929).
- Live data: Adaptive UI still does not query; the ES|QL → `render_view` compose is documented, and sample web logs is the dataset it assumes.
- Seam proposal: contract change is additive/opt-in; dependency-direction decision (shared component vs start-contract injection) is called out for the Agent Builder team.
- Nightshift: `streams.significantEvent` and `nightshift.investigation` are registered views; event CTAs open `/app/nightshift`; investigations GET returns `state`. Prompts 10–13 are the product demo. Open in chat uses the existing sig-event React body; Adaptive UI is the agent tools, not that flyout button.
