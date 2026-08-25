# Review script: Adaptive UI portable chat (`adaptive-ui/portable-chat-product`)

**Status:** current on the Nightshift product side branch · **Trunk:** `adaptive-ui/portable-chat` (Slack Block Kit, no Nightshift product commit) · **Do not merge** [#286929](https://github.com/elastic/kibana/pull/286929) onto the demo trunk.

This is a walkthrough, not an architecture dump. Setup once for the demos you want. Each numbered chat demo is a **new Agent Builder conversation** — do not continue a prior demo’s thread. A demo may take several tool calls in that one conversation. Setup rows below are prerequisites, not a run order among demos.

Figma attachment replacements (native types via `getViewSpec`, adapters from 21322f): [`adaptive_ui_portable_chat_attachments.md`](./adaptive_ui_portable_chat_attachments.md).

Adaptive UI adapters do not fetch. `request_registered_view` looks up a live Significant Event or Nightshift investigation by id and maps it through those adapters. Slack and ES|QL sit on top: a `.slack2` connector, Agent Builder data tools, and (for investigations) the Nightshift investigations client. The Nightshift GET is internal and not tool-callable — the registered view is the tool-callable path.

Background (what shipped, coverage, tests, caveats) is in [Appendix](#appendix).

## How far to go

Each chat demo is independent once its setup row is done. Skip any demo you do not need.

| Stop after | Unlocks |
| --- | --- |
| Setup 0 | Demos 1–2 (offline, no stack) |
| + Setup 1 | Demos 3–5 and 7 (chat, authoring) |
| + Setup 2 | Demos 9–10, 12, and 16 Slack post (token bot) |
| + Setup 3 | Demos 11–12 (live ES\|QL) |
| + Setup 4 | Demos 6, 8, 13–14, and 16 (live events and investigations) |
| + Setup 5 | Demo 15 (managed Elastic Slack app). Demo 16 prefers this connector when it exists. |

**Short review (authoring + adapters):** Setup 0–1, demos 1–5. **Product path:** setups 0–4, then demos 6–8, 13–14, and 16 (token Slack from setup 2 is enough for the Slack post). Add setup 5 only if you have a Relay URL and want demo 15.

## Setup

Do these in order. Use Node from `.nvmrc` (`v24.19.0`).

### 0. Vendor Adaptive UI (always)

`vendor/` is gitignored. Until you sync once, type-checking, tests, and the plugin cannot resolve the library. In the upstream Adaptive UI repo run `yarn build:packages`, then in Kibana:

```bash
node src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs --from /path/to/adaptive-ui-poc
```

See [`@kbn/adaptive-ui`](../../src/platform/packages/shared/adaptive-ui/README.md).

### 1. Boot Kibana (demos 3+)

```bash
yarn es snapshot
yarn start
```

Agent Builder is on by default in stateful dev (`xpack.agentBuilder.enabled`). Open **Chat**.

If a prompt is answered as prose instead of a tool call, the tools may not be allow-listed for that agent. Confirm `render_view`, `get_authoring_context`, `request_registered_view`, and (from setup 2) `post_view_to_slack` are enabled. They are in the default builtin set via [`tools/constants.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/constants.ts) and [`allow_lists.ts`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts).

### 2. Slack token connector (demos 9–10, 12, and 16 without Relay)

Needed for `post_view_to_slack` on a local stack. The offline script in demo 2 does **not** replace this. Demo 16 uses this connector unless setup 5 registered `elastic-apps-slack`.

1. Stack Management → Advanced Settings → `Elastic Agent Builder: Experimental Features` (`agentBuilder:experimentalFeatures`) → On. Without this the tool reports unavailable.
2. Create a **Slack (v2)** connector (Slack API / Web API, not incoming-webhook). Scopes: `chat:write` required; `files:write` required for chart images (otherwise charts fall back to text). Invite the bot to the target channel.
3. Add that connector to the agent (Agent → Connectors). A connector attachment appears with the Connector ID and sub-actions (`listChannels`, `resolveChannelId`, `sendMessage`).
4. If `xpack.actions.allowedHosts` is not `*`, include both `slack.com` and `files.slack.com` (this tree's [`config/kibana.dev.yml`](../../config/kibana.dev.yml) already does). Chart bytes go to a different host than the API.

Relative `href`s are rewritten to `server.publicBaseUrl` (or `getServerInfo` + the current space) before posting. On a local stack those URLs are `http://localhost:5601/…` unless you set `server.publicBaseUrl`. `yarn start` typically uses a random base path.

### 3. Sample web logs (demos 11–12)

Home → **Sample data** → **Sample web logs** (creates `kibana_sample_data_logs`). A snapshot with no data makes `execute_esql` return empty rows; the view should then be an honest empty state, not invented numbers.

### 4. Nightshift seed (demos 13–14, 16)

Nightshift is gated on `GET /internal/significant_events/availability`. Direct-visit `/app/nightshift`; if it redirects to Observability overview, the gate is off. This tree already sets `feature_flags.overrides.streams.significantEventsAvailable: true` in [`config/kibana.dev.yml`](../../config/kibana.dev.yml). See the [Nightshift README](../../x-pack/solutions/observability/plugins/nightshift/README.md).

A fresh `yarn es snapshot` has no events. From the repo root, with Elasticsearch and Kibana up (`ES_URL` / `KIBANA_URL` default to localhost:9200 / 5601):

```bash
./x-pack/solutions/observability/plugins/nightshift/scripts/seed_nightshift.sh
```

That indexes events, enables Streams, and **starts** investigations. It does not wait for those workflows to finish. Demo 16 needs a **completed** investigation whose GET `state` is populated — wait until Nightshift shows one complete, or skip 16.

### 5. Elastic Slack app (demo 15; optional for 16)

This is a managed in-memory `.slack2` (`authType: relay`, id `elastic-apps-slack`, name **Slack (Elastic app)**) registered when you connect Slack from Significant Events settings ([#286929](https://github.com/elastic/kibana/pull/286929)). No `xoxb-`. It does **not** appear in Stack Management → Connectors. Demo 10 (chart PNG) stays on the token connector from setup 2 — Relay has no `uploadFile` / `files:write`.

A local `yarn start` does **not** create this connector. This tree’s [`config/kibana.dev.yml`](../../config/kibana.dev.yml) turns on Nightshift (`streams.significantEventsAvailable`) and allows `slack.com` / `files.slack.com`. It does **not** set Relay or the Apps flag. Without both of the following, the Apps card is hidden and `elastic-apps-slack` is never registered — skip demo 15 and post demo 16 through the token Slack (v2) connector from setup 2.

1. Experimental features already on from setup 2.
2. A Relay service URL Kibana can reach. There is no Relay in this Kibana repo. Source and local runbook: [`elastic/relay-service`](https://github.com/elastic/relay-service) ([local development](https://github.com/elastic/relay-service/blob/main/docs/development/local-development.md) / [Codex](https://codex.elastic.dev/r/relay-service/development/local-development)). For Demo 15 on `yarn start`, clone that repo and `npm run dev:slack` (Slack sandbox + cloudflared tunnel), then set `xpack.actions.relay.url: "http://localhost:3000"` and add `localhost` to `xpack.actions.allowedHosts`. ECH injects `https://relay-service.svc.<env>.elastic.cloud` plus mTLS (`ecp-client` certs) via kibana-controller — a laptop Kibana cannot use those internal `svc` hostnames. HTTP Relay URLs are allowed only in `dev`. Restart after changing yml.
3. `feature_flags.overrides.streams.significantEventsAppsEnabled: true` in the same yml (defaults **off**, separate from `significantEventsAvailable`). Restart again.
4. The Apps card is under Significant Events settings (`/app/significant_events/settings`), also linked from Nightshift’s header **Settings** — not a Streams nav item. It still renders nothing if Relay is unset or Agent Builder is absent.
5. Connect the workspace (OAuth); bind channels in that card. That registers `elastic-apps-slack`. If the agent’s `connector_ids` is unset it already sees every connector; otherwise add that id. Relay `listChannels` returns bound channels; posting to an unbound channel fails with “Channel … is not connected to this deployment.”

`post_view_to_slack` does not talk to Relay. It uses `sendMessage({ text, blocks, threadTs })`. `RelayClient.trigger` forwards `blocks` on `POST /v1/trigger`.

---

## Demos

Start a **new** Agent Builder conversation for each numbered chat demo. Paste the prompt as written. After a tool call, the agent should render with `<render_attachment>` and **not** restate the card as prose.

### 1. Every adapter is a portable spec

**Need:** setup 0. **Proves:** one `ViewSpec` renders as plain text, GitHub markdown, Slack Block Kit, and Kibana React — without booting Kibana.

[`cross_surface_demo.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts) iterates `adapterGallery`:

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts
```

**Expect:** every attachment adapter validates and renders to markdown (and one to Slack blocks). This is the "the payload is the seam" argument. The gallery includes the two chart adapters — `security.entity_analytics_dashboard` (`donut`) and `security.entity_risk_score_history` (`timeSeries`). Markdown describes those charts as text; React is demo 4, PNG upload is demo 10.

### 2. Investigation Block Kit without posting

**Need:** setup 0. **Proves:** the Nightshift investigation archetype is Block Kit, not markdown. No token.

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype nightshift.investigation --dry-run
```

**Expect:** Block Kit with remediations, blind spots, and a Nightshift href. To actually post (still bypassing the agent and connector — no chart PNG rasterization):

```bash
SLACK_BOT_TOKEN=xoxb-… SLACK_CHANNEL=C012AB3CD \
  node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype nightshift.investigation
```

The bot needs `chat:write`; invite it to the channel first. This script does **not** rasterize charts. Dry-run the chart fixtures the same way — the blocks are the text fallback, not PNGs:

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype security.entity_analytics_dashboard --dry-run

node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype security.entity_risk_score_history --dry-run
```

PNG upload is demo 10 (in-product `post_view_to_slack`).

### 3. Tools are reachable

**Need:** setup 1. **Proves:** Adaptive UI tools are allow-listed and the agent will call them.

```text
Use the get_authoring_context tool and list the Adaptive UI primitives available for authoring a view.
```

**Expect:** a primitive catalog, not a guessed list. Confirm `donut` and `timeSeries` are in it (chart pack). If the agent answers in prose, fix the allow-list before any later chat demo.

### 4. Paste a spec — rendering, not the LLM

**Need:** setup 1. **Proves:** `render_view` → `platform.adaptiveUi.view` attachment (production-shaped path: allow-list, chrome, canvas). Bypasses model authoring.

```text
Call the render_view tool with exactly this spec, then render the returned attachment with <render_attachment>. Do not restate the content as prose.

{"type":"view","title":"Ingest pipeline restarted","subtitle":"agent.node-2 · 12:04 UTC","body":[{"type":"text","format":"markdown","body":"Restarting the ingest pipeline cleared the backlog on `agent.node-2`. The two data nodes that were behind on indexing have caught up; monitor `logs-000042` for recurrence over the next hour."},{"type":"codeBlock","title":"Last 6 log lines","language":"log","code":"[12:03:58] WARN  ingest: queue depth 18211 exceeds soft limit\n[12:04:01] INFO  ingest: draining queue for logs-000042\n[12:04:02] INFO  ingest: pipeline \"logs-default\" restarted\n[12:04:03] INFO  ingest: queue depth 0\n[12:04:03] INFO  ingest: backlog cleared in 4.2s\n[12:04:04] INFO  ingest: steady state"}]}
```

**Expect:** attachment card with header chrome (`EuiSplitPanel.Outer` + `AttachmentHeader`) and an **Expand** canvas affordance.

**Same conversation, with charts.** These are the `security.entity_analytics_dashboard` and `security.entity_risk_score_history` adapter fixtures — a `donut` and a `timeSeries`. Not registered views; paste each spec so you test rendering, not the LLM.

```text
Call the render_view tool with exactly this spec, then render the returned attachment with <render_attachment>. Do not restate the content as prose.

{"type":"view","title":"Entity analytics","subtitle":"Risk overview","body":[{"type":"statGroup","label":"Entities by risk level","stats":[{"label":"Critical","value":"5","tone":"danger"},{"label":"High","value":"12","tone":"risk"},{"label":"Medium","value":"34","tone":"warning"},{"label":"Low","value":"88","tone":"success"}]},{"type":"donut","label":"Risk distribution","segments":[{"label":"Critical","value":5,"tone":"danger"},{"label":"High","value":12,"tone":"risk"},{"label":"Medium","value":34,"tone":"warning"},{"label":"Low","value":88,"tone":"success"}]},{"type":"table","label":"Top risky entities","columns":[{"id":"entity","label":"Entity"},{"id":"type","label":"Type"},{"id":"score","label":"Risk score"},{"id":"level","label":"Level"}],"rows":[{"entity":"finance-db-01","type":"host","score":"96","level":{"type":"badge","label":"Critical","tone":"danger"}},{"entity":"a.wong","type":"user","score":"91","level":{"type":"badge","label":"Critical","tone":"danger"}},{"entity":"finance-web-03","type":"host","score":"74","level":{"type":"badge","label":"High","tone":"risk"}}]},{"type":"text","body":"Risk is concentrated in the finance subnet: three hosts and two users crossed the critical threshold in the last 24 hours."},{"type":"itemList","label":"Anomaly highlights","items":[{"title":"Unusual process on finance-db-01","body":"Encoded PowerShell not seen on this host in the trailing 30 days."},{"title":"Impossible travel for a.wong","body":"Sign-ins from two regions 400ms apart."}]}]}
```

```text
Call the render_view tool with exactly this spec, then render the returned attachment with <render_attachment>. Do not restate the content as prose.

{"type":"view","title":"finance-db-01 risk history","subtitle":"Entity risk score","body":[{"type":"statGroup","label":"Latest","stats":[{"label":"Risk score","value":"96","tone":"danger"},{"label":"Risk level","value":"Critical","tone":"danger"}]},{"type":"timeSeries","label":"Risk score history","variant":"area","series":[{"label":"finance-db-01","tone":"danger","values":[{"time":"2026-08-13T00:00:00.000Z","value":41},{"time":"2026-08-14T00:00:00.000Z","value":48},{"time":"2026-08-15T00:00:00.000Z","value":55},{"time":"2026-08-16T00:00:00.000Z","value":63},{"time":"2026-08-17T00:00:00.000Z","value":78},{"time":"2026-08-18T00:00:00.000Z","value":89},{"time":"2026-08-19T00:00:00.000Z","value":96}]}]},{"type":"descriptionList","label":"History","layout":"inline","items":[{"title":"Entity","description":"finance-db-01 (host)"},{"title":"Range","description":"2026-08-13T00:00:00.000Z → 2026-08-19T00:00:00.000Z"},{"title":"Interval","description":"1d"}]}]}
```

**Expect:** a donut of risk levels, then an area `timeSeries` of `finance-db-01`. Expand canvas — both charts should still render. Failure: the agent restates the JSON as markdown instead of `render_view`.

### 5. The model authors a spec

**Need:** setup 1. **Proves:** `get_authoring_context` → model-authored `ViewSpec` → `render_view`, including a chart primitive.

```text
Render an Adaptive UI view (use the render_view tool) summarizing this incident as a card with a status badge, a short prose summary, a table of the two signals below, and a donut whose segments are those two signals (use the numeric values from the incident; do not invent extra series). Call get_authoring_context first for the primitive catalog. Render the returned attachment; do not repeat the content as text.

Incident: checkout error rate spiked 4× in eu-west-1 after the payment-service v2.4.1 deploy at 14:02 UTC.
Signals:
- Payment error rate (logs-payment-service): 5xx on POST /charge rose 0.4% → 6.1% at 14:05 UTC — anomaly
- DB connection pool utilization (metrics-payment-service): active connections pinned at 20/20 since 14:04 UTC — saturated
```

**Expect:** a card with badge, summary, table, and a `donut`. Failure: the agent restates the incident as markdown instead of calling `render_view`, or it skips the donut.

### 6. Live significant event

**Need:** setup 4. **Proves:** `request_registered_view` for `streams.significantEvent` looks up a live event by `event_id`. It does not render sample data.

```text
Search open significant events with platform.sig_events.event_search (compact). Pick one event_id. Use request_registered_view with viewId "streams.significantEvent" and input { "event_id": "<that id>" }, then render the returned attachment with <render_attachment>. Do not restate the view as prose. Do not invent findings.
```

**Expect:** a card whose title and summary match that search hit — not payment-service sample data. **View in Nightshift** points at `/app/nightshift?eventId=…` (`eventUuid` when present). Failure: the tool returns an error asking for `event_id`; or the card describes a different incident than Nightshift.

### 7. Missing id is an error, not a sample card

**Need:** setup 1. **Proves:** omitting `event_id` does not fall back to sample data.

```text
Use the request_registered_view tool with viewId "streams.significantEvent" and no input.
```

**Expect:** a tool error that `event_id` is required. Failure: a dropped-payments card.

### 8. Live investigation

**Need:** setup 4, a completed investigation. **Proves:** `nightshift.investigation` looks up live findings (conclusion, ranked remediations, blind spots, evidence).

```text
Find the latest completed Nightshift investigation. Use request_registered_view with viewId "nightshift.investigation" and that investigation_id (or the event_id it belongs to), then render the returned attachment with <render_attachment>. Do not restate the view as prose. Do not invent findings.
```

**Expect:** remediations (optional `code` as `codeBlock`), blind spots, and evidence that match Nightshift for that investigation — not payment-service sample data.

### 9. Post a chat card to Slack (token bot)

**Need:** setup 2. **Proves:** in-product `post_view_to_slack` through `.slack2` `sendMessage` — native Block Kit, not a blob of markdown. Use the token Slack API connector, not the Elastic Slack app.

```text
1. Call the render_view tool with exactly this spec, then render the returned attachment with <render_attachment>.

{"type":"view","title":"Ingest pipeline restarted","subtitle":"agent.node-2 · 12:04 UTC","body":[{"type":"text","format":"markdown","body":"Restarting the ingest pipeline cleared the backlog on `agent.node-2`. The two data nodes that were behind on indexing have caught up; monitor `logs-000042` for recurrence over the next hour."},{"type":"codeBlock","title":"Last 6 log lines","language":"log","code":"[12:03:58] WARN  ingest: queue depth 18211 exceeds soft limit\n[12:04:01] INFO  ingest: draining queue for logs-000042\n[12:04:02] INFO  ingest: pipeline \"logs-default\" restarted\n[12:04:03] INFO  ingest: queue depth 0\n[12:04:03] INFO  ingest: backlog cleared in 4.2s\n[12:04:04] INFO  ingest: steady state"}]}

2. Post that Adaptive UI view to Slack. Use post_view_to_slack with the view's attachmentId. Resolve the Slack (v2) connector ID from the connector attachment (the token Slack API connector, not the Elastic Slack app). Resolve the channel ID with listChannels (or resolveChannelId) for a channel the bot is in. Do not invent a connector or channel id. After it posts, tell me the channel and message ts; do not restate the view as prose.
```

**Expect:** a Block Kit card in Slack that matches the chat attachment, and a tool result with `{ channel, ts, blocks, title }`. If Slack shows plain text with no blocks, `sendMessage` did not carry `blocks` (or the agent picked a connector that cannot).

### 10. Chart as PNG (token bot only)

**Need:** setup 2; bot must have `files:write`. **Proves:** Slack has no chart block, so `post_view_to_slack` rasterizes and `uploadFile`s. Use the token Slack API connector — Relay has no `uploadFile`.

```text
Post this Adaptive UI view to Slack with post_view_to_slack, using an inline spec (not an attachment). Resolve the Slack (v2) connector ID from the connector attachment (the token Slack API connector, not the Elastic Slack app) and the channel ID with listChannels. Do not invent ids. After it posts, tell me the channel and message ts; do not restate the view as prose.

{"type":"view","title":"Entity risk","subtitle":"Last 24 hours","body":[{"type":"statGroup","label":"Entities by risk level","stats":[{"label":"Critical","value":"5","tone":"danger"},{"label":"High","value":"12","tone":"risk"},{"label":"Medium","value":"34","tone":"warning"}]},{"type":"donut","label":"Risk distribution","segments":[{"label":"Critical","value":5,"tone":"danger"},{"label":"High","value":12,"tone":"risk"},{"label":"Medium","value":34,"tone":"warning"},{"label":"Low","value":88,"tone":"success"}]}]}
```

Optional second step in this same conversation — a `timeSeries`:

```text
Post this Adaptive UI view to Slack with post_view_to_slack, using an inline spec (not an attachment). Resolve the Slack (v2) connector ID from the connector attachment and the channel ID with listChannels. Do not invent ids.

{"type":"view","title":"finance-db-01 risk history","subtitle":"Entity risk score","body":[{"type":"statGroup","label":"Latest","stats":[{"label":"Risk score","value":"96","tone":"danger"},{"label":"Risk level","value":"Critical","tone":"danger"}]},{"type":"timeSeries","label":"Risk score history","variant":"area","series":[{"label":"finance-db-01","tone":"danger","values":[{"time":"2026-08-13T00:00:00.000Z","value":41},{"time":"2026-08-14T00:00:00.000Z","value":48},{"time":"2026-08-15T00:00:00.000Z","value":55},{"time":"2026-08-16T00:00:00.000Z","value":63},{"time":"2026-08-17T00:00:00.000Z","value":78},{"time":"2026-08-18T00:00:00.000Z","value":89},{"time":"2026-08-19T00:00:00.000Z","value":96}]}]}]}
```

**Expect:** an `image` block whose `slack_file` id came from `uploadFile`, not a leftover placeholder. If rasterize or upload fails, the tool re-renders without asset collection and the chart becomes text rather than posting a broken image.

### 11. Live ES|QL → view

**Need:** setup 3. **Proves:** Agent Builder data tools compose into a `ViewSpec`. The model is the adapter; Adaptive UI still does not query.

```text
List available indices. If kibana_sample_data_logs (or any logs index) exists, generate and execute ES|QL over the last 24 hours: (1) a count of documents grouped by a useful field (response code, dataset, or host — whatever the mapping supports), and (2) if a time field exists, a count by hour. Then render an Adaptive UI view of those real rows: a title, a stat group of totals, a donut of the grouped counts, a timeSeries of the hourly counts when you have them, and a table of the grouped counts. Call get_authoring_context before composing the spec. Use render_view, then render the returned attachment with <render_attachment>. Do not invent rows. Do not restate the view as prose.
```

**Expect:** stats, donut (and timeSeries when the histogram ran), and table that match the ES|QL result from that turn (spot-check one number). Failure: the agent restates the table as markdown, fabricates a spec without executing a query, or skips the chart primitives.

### 12. Live ES|QL view → Slack

**Need:** setup 2 and 3. **Proves:** live compose plus token-bot `post_view_to_slack` in one conversation. Use the token Slack API connector, not the Elastic Slack app.

```text
List available indices. If kibana_sample_data_logs (or any logs index) exists, generate and execute ES|QL over the last 24 hours: (1) a count of documents grouped by a useful field (response code, dataset, or host — whatever the mapping supports), and (2) if a time field exists, a count by hour. Then render an Adaptive UI view of those real rows: a title, a stat group of totals, a donut of the grouped counts, a timeSeries of the hourly counts when you have them, and a table of the grouped counts. Call get_authoring_context before composing the spec. Use render_view, then render the returned attachment with <render_attachment>. Do not invent rows. Do not restate the view as prose.

Then post that view to Slack with post_view_to_slack using its attachmentId. Resolve the Slack (v2) connector ID from the connector attachment (the token Slack API connector, not the Elastic Slack app) and the channel ID with listChannels. Do not invent ids. After it posts, tell me the channel and message ts.
```

**Expect:** Block Kit in Slack whose numbers match the chat attachment. A donut or timeSeries also exercises PNG upload (`files:write` on the token bot).

### 13. Open in chat — Adaptive UI without `render_view`

**Need:** setup 4. **Proves:** the `getViewSpec` seam on `platform.sig_event`. When that attachment is mounted as a card, the inline body is Adaptive UI; canvas stays native `SignificantEventDetails` (live ES|QL). The agent does **not** call `render_view`.

This is easy to miss on a seeded event. `evt-001` is already investigated, so flyout **Open in chat** is a **menu**, not a single button.

**Do not pick the investigation title** (first menu item). That restores the investigation conversation — tool calls, a JSON context blob, no Adaptive UI card. That is not this demo.

1. On `/app/nightshift`, either click the **chat icon on the landing row** (always a new conversation), or in the event flyout open **Open in chat** → **New chat about this event**.
2. Confirm a Significant Event **attachment pill** in the composer and the prefilled prompt `Explain this significant event: …`.
3. Send this (replaces the prefill). The pill is context; Adaptive UI only appears once the agent emits `<render_attachment>` for that id:

```text
Render the attached significant event with <render_attachment>. Do not restate the event as prose.
```

4. **Expect:** an attachment card whose **inline** body is Adaptive UI (status/severity badges, summary, signals table, **View in Nightshift**) — live `evt-001` data, the same lookup path as demo 6. Click **Open preview** (or Expand) and confirm native event details in the canvas, including live ES|QL.

Failure: investigation conversation (long title like "API Gateway v2.8.1 Rollout…", tool pills, no card) — you picked the wrong menu item. Failure: the agent restates the event as markdown instead of `<render_attachment>`.

The investigation **card** is still `request_registered_view` / `nightshift.investigation`. Investigation flyout **Open in chat** only restores that conversation; it does not attach a new type.

### 14. Live significant event → registered view

**Need:** setup 4. Skip on a fresh snapshot with no events. **Proves:** passing only `event_id` is enough; the view looks up the live event.

```text
Search open significant events with platform.sig_events.event_search (compact). If there are none, stop and say so. Pick one event_id. Call request_registered_view with viewId "streams.significantEvent" and input { "event_id": "<that id>" }, then render the returned attachment with <render_attachment>. Do not invent findings. Do not restate the view as prose.
```

**Expect:** a card whose title, summary, and signals match that search hit and the Nightshift flyout. Failure: a tool error (missing event_id / event not found); or a card for a different incident.

### 15. Investigation card → on-call channel (Elastic Slack app)

**Need:** setup 5. **Proves:** `post_view_to_slack` through the managed Elastic Slack app. No `xoxb-`. Do not invent ids. Do not use the token connector from setup 2.

```text
1. Find a completed Nightshift investigation. Use request_registered_view with viewId "nightshift.investigation" and that investigation_id (or the event_id it belongs to), then render the returned attachment with <render_attachment>. Do not restate the view as prose. Do not invent findings.

2. Post that Adaptive UI view to Slack. Use post_view_to_slack with the view's attachmentId. Resolve the Slack (v2) connector ID from the connector attachment, preferring the Elastic Slack app connector created when this deployment connected Slack from Significant Events settings. Resolve the channel ID with listChannels for a connected channel. Do not invent a connector or channel id. After it posts, tell me the channel and message ts; do not restate the view as prose.
```

**Expect:** native Block Kit matching the chat attachment. Tool result `{ channel, ts, blocks, title }`. Click **View in Nightshift**: it should open `/app/nightshift?eventId=…` (and `eventUuid` when the fixture has it). If Slack shows plain text with no blocks, `sendMessage` did not carry `blocks` (or the agent picked a connector that cannot). Unbound channel → `403`.

### 16. Live investigation → chat → Slack

**Need:** setup 4, a **completed** investigation, and a Slack `.slack2` (setup 2 token bot, or setup 5 Elastic app if you have Relay). **Proves:** the honest product loop. `request_registered_view` looks up the investigation; the agent does not flatten workflow step output.

```text
Find the latest completed Nightshift investigation, render it as an Adaptive UI card, then post it to Slack. Do not invent findings. Do not rewrite the conclusion as markdown.

Do not: discover_apis for "nightshift"; GET /internal/nightshift/investigations/{id}; platform.core.get_workflow_execution_status; platform.core.search / ES|QL for investigations; run_subagent; write_todos; describe_api; sml_search for Slack.

1. platform.core.list_workflow_executions with workflowId "system-significant-events-investigation", statuses ["completed"], limit 1. That executionId is the investigation id. If none, stop.

2. request_registered_view viewId "nightshift.investigation" with input { "investigation_id": "<executionId>" }. Render with <render_attachment>.

3. post_view_to_slack with that attachmentId. Resolve the Slack (v2) connector ID from the connector attachment: prefer id elastic-apps-slack (name Slack (Elastic app)) if present, else the token Slack API connector from setup 2. Do not sml_search. listChannels for a channel that connector can post to. Do not invent ids. Tell me channel, message ts, the connector id used, and the Nightshift event id.
```

**Expect:** a Slack card whose remediations and evidence match the Nightshift flyout for that event, and whose primary button opens that flyout. Spot-check one recommendation title and one evidence row against `/app/nightshift?eventId=…`.

Failure: a sample dropped-payments card; `sml_search` "Slack"; `discover_apis` for Nightshift. Unbound Elastic-app channel → `403`. A fresh snapshot with no completed investigation cannot run this — skip 16. Skip the Elastic-app connector if setup 5 was not done — the token bot is the intended local path.

---

## Appendix

### What this branch delivers

The demo trunk's four portable-chat commits, plus the Nightshift product work on this side branch:

| # | Commit | What |
| --- | --- | --- |
| 1 | Vendor Adaptive UI as a single `@kbn/adaptive-ui` package | Wrap `@elastic/adaptive-ui-host-kibana` in one Kibana package; [`sync_dist.mjs`](../../src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs) vendors the upstream workspace closure into `vendor/` and rewrites `@elastic/*` specifiers to relative paths |
| 2 | Port the `adaptive_ui` plugin | The `view` renderer (server + browser), the `platform.adaptiveUi.view` attachment, the `render_view` / `get_authoring_context` / `request_registered_view` tools, the code-owned view registry, `KibanaAdaptiveView` isolation, and codeBlock grammar registration |
| 3 | Data→ViewSpec adapters | A pure `to<Type>ViewSpec` adapter plus a cross-surface golden test per pure-presentational attachment type, the shared harness, and the primitive-gap and body-seam design docs |
| 4 | Post views to Slack as Block Kit | Host href resolution, the `post_view_to_slack` tool, the `.slack2` Block Kit + file-upload support, and chart PNG rasterization |
| 5 | Honest Nightshift demo (this branch) | Investigation cards + flyout hrefs + GET `state`; markdown `conclusion` / `gaps_found` fallback; `getViewSpec` seam with `platform.sig_event`; [#286929](https://github.com/elastic/kibana/pull/286929) managed Slack app with `RelayClient.trigger` forwarding `blocks` |

The vendored `vendor/` tree is gitignored. `sync_dist.mjs` records the revision it pulled in the gitignored `src/platform/packages/shared/adaptive-ui/.vendored_upstream.json` stamp.

### Architecture

- **One vendored package**, [`@kbn/adaptive-ui`](../../src/platform/packages/shared/adaptive-ui): a thin wrapper over `@elastic/adaptive-ui-host-kibana`. [`scripts/sync_dist.mjs`](../../src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs) copies the upstream workspace closure into `vendor/` and rewrites `@elastic/*` specifiers to relative paths, so Kibana never tracks upstream's package graph.
- **The `adaptive_ui` plugin** (`adaptiveUi`, [`kibana.jsonc`](../../x-pack/platform/plugins/shared/adaptive_ui/kibana.jsonc)) registers four tools (`render_view`, `get_authoring_context`, `request_registered_view`, `post_view_to_slack`), a code-owned view registry (`streams.significantEvent`, `nightshift.investigation`), the `view` renderer on both server and browser, and the `platform.adaptiveUi.view` attachment.
- **Three registration paths** (plan §3): the `platform.adaptiveUi.view` attachment (full chrome + canvas), the `view` renderer (`<render type="view">`, no chrome), and a core `getViewSpec` seam so existing types can swap their **inline** body for a `ViewSpec` while keeping chrome (canvas keeps `renderCanvasContent` when set). Landed for `platform.sig_event`. See [`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md).
- **Portability:** the shared harness [`cross_surface.test.helpers.tsx`](../../x-pack/platform/plugins/shared/adaptive_ui/public/renderers/cross_surface.test.helpers.tsx) asserts each adapter's `ViewSpec` as plain text, GitHub markdown, Slack Block Kit, and the Kibana React body.
- **Adapters:** [`@kbn/adaptive-ui-adapters`](../../x-pack/platform/packages/shared/adaptive-ui-adapters) holds a pure `to<Type>ViewSpec(data): ViewSpec` per pure-presentational Agent Builder attachment type behind the Figma live examples. These are isomorphic (plain `@kbn/adaptive-ui/builders`, no React). `getViewSpec` on [`AttachmentUIDefinition`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-browser/attachments/contract.ts) mounts that spec through `KibanaAdaptiveView` for the inline body. Input types come from `@kbn/agent-builder-common` where importable (`text`, `esql`); every other type uses a local structural interface with a doc link to the source type, so the adapters package needs no dependency on Cases, Security, Alerting, Workflows, or Streams. The `adaptive_ui` plugin wires registered views onto those adapters; owning plugins import the package for `getViewSpec`.
- **Nightshift:** event cards (`streams.significantEvent` / `platform.sig_event`) primary-link to `/app/nightshift?eventId=…` (`eventUuid` when present), with **Open in Streams** as a fallback. Investigation cards render conclusion, ranked remediations, blind spots, and evidence from the live Nightshift investigations client. `request_registered_view` looks up by `event_id` / `investigation_id`; it does not merge sample data.

### Adapter coverage (Figma type → adapter → status)

Every adapter is applied to its sample and listed in [`index.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/index.ts) as `adapterGallery`.

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
| `platform.sig_event` | [`sig_event.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event.ts) (registered view) + [`sig_event_attachment.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event_attachment.ts) (live attachment / `getViewSpec`) | `badge`, `statGroup`, `panel`, `table`, `descriptionList`, `actions` | Clean (ES\|QL log evidence omitted — needs runtime query). Primary CTA is `/app/nightshift?eventId=…` (`eventUuid` when present). Open in chat inline is Adaptive UI; canvas stays native `SignificantEventDetails`. |
| `nightshift.investigation` | [`investigation.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/investigation.ts) | `badge`, `panel`, `itemList`, `codeBlock`, `table`, `actions` | Clean. Registered view. Prefers structured `recommendations` / `blind_spots`; else parses markdown `conclusion` + `gaps_found`. |
| `platform.sig_event_detection` | [`sig_event_detection.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event_detection.ts) | `badge`, `descriptionList`, `codeBlock` | Clean (optional `esql_query`) |
| `platform.ki_feature` | [`ki_feature.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/ki_feature.ts) | `badge`, `descriptionList`, `codeBlock` | Clean |
| `skill` | [`skill.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/skill.ts) | `text`, `codeBlock`, `badge`, `itemList` | Clean (body subset) |
| `connector_setup` | [`connector_setup.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/connector_setup.ts) | `badge`, `callout` | Clean (prompt subset) |
| `security.entity_analytics_dashboard` | [`entity_analytics_dashboard.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/entity_analytics_dashboard.ts) | `statGroup`, `donut`, `table`, `itemList` | Clean |
| `security.entity_risk_score_history` | [`entity_risk_score_history.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/entity_risk_score_history.ts) | `statGroup`, `timeSeries`, `descriptionList` | Clean |
| `graph` | [`graph.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/graph.ts) | `graph` | Clean. Attachment `type` becomes the node group; trimmed to the primitive's 24-node budget |
| `observability.service-map` | [`service_map.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/service_map.ts) | `graph` | Clean. Health → node tone, latency and error rate → edge label, throughput → edge weight |

**Out of scope (live-fetch types):** `security.rule.preview`, `security.entity`, `security.entity_graph`, `platform.dashboard.dashboard_state` panel data, `visualization` chart data, and the `platform.sig_event` ES|QL log rows — these need runtime data, not a static `ViewSpec`, and belong to the seam's `renderInlineContent` fallback.

### Automated checks

These were re-run against the final tree and pass.

```bash
# Unit (adapter suites: `node scripts/jest … "adapter\.test"`)
node scripts/jest --config x-pack/platform/plugins/shared/adaptive_ui/jest.config.js

# Types: exits 0
node scripts/type_check --project x-pack/platform/plugins/shared/adaptive_ui/tsconfig.json

# Lint: clean
node scripts/eslint x-pack/platform/plugins/shared/adaptive_ui

# Nightshift GET `state` + RelayClient.trigger(blocks) + Slack relay sendMessage(blocks)
node scripts/jest --config x-pack/solutions/observability/plugins/nightshift_investigations/jest.config.js
node scripts/jest x-pack/platform/plugins/shared/actions/server/lib/relay/relay_client.test.ts
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/specs/slack/relay.test.ts
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/specs/slack/slack.test.ts

# getViewSpec seam + platform.sig_event adopter
node scripts/jest x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/attachments/inline_attachment_with_actions.test.tsx
node scripts/jest x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/attachments/canvas_flyout.test.tsx
node scripts/jest x-pack/platform/plugins/shared/significant_events_app/public/components/significant_event_attachment/significant_event_attachment.test.tsx
```

Each adapter suite asserts that its archetype maps to a valid `ViewSpec` (`validateView`), renders across all four surfaces without throwing, and carries the expected data into the rendered React tree. Verbatim off-Kibana output is not snapshotted — that is the upstream library's responsibility, and pinning it here only churns on every re-vendor.

### Caveats

- **codeBlock syntax highlighting is React/SVG only and opt-in.** Browser start registers the default grammars over `@kbn/adaptive-ui/syntax`; text, markdown, and Slack keep plain monospace.
- **The body seam is landed for the contract + `platform.sig_event`.** Inline uses `getViewSpec` over `renderInlineContent`; canvas keeps `renderCanvasContent` when set. See [`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md).
- **The PNG surface** (`@kbn/adaptive-ui/node`) is server-only and off the chat path. It backs `post_view_to_slack` (demo 10). The in-chat renderer and the offline `post_to_slack_demo` script never hit it. Do not run demo 10 against the Elastic Slack app.
- **Live ES|QL is still compose.** There is no runtime resolver that turns an ES|QL response into a `ViewSpec`; the model is the adapter. Demo 11 is the honest demo of that path. Registered Nightshift views are the exception: `request_registered_view` looks up the live event or investigation by id.
- **Demo 13** shows Adaptive UI inline for `platform.sig_event` via `getViewSpec` when the agent emits `<render_attachment>` — not `render_view`. Flyout **Open in chat** on an investigated event restores the investigation conversation unless you pick **New chat about this event**.
- **Live investigation `state` is a passthrough of `structured_output`.** `toInvestigationViewSpec` prefers structured `recommendations` / `blind_spots` / prose `conclusion`, and falls back to markdown `conclusion` / `gaps_found`.
- **Demo 15 uses the Elastic Slack app.** `RelayClient.trigger` forwards `blocks`; `uploadFile` is unsupported on relay. Charts use the token connector.

### Reviewer checklist

- Vendoring: is `vendor/` gitignored (never committed), and does a fresh `sync_dist.mjs` run leave the tree clean and write the `.vendored_upstream.json` stamp? (`sync_dist.mjs`, package README.)
- Plugin: no relay residue, no `agent-builder-server` hook edits; allow-list additions match the registered tool/attachment ids.
- Renderer: `getHeader` maps spec `title`/`subtitle`; `parseViewSpec` narrows the loose schema payload rather than casting.
- Adapters: each `to<Type>ViewSpec` maps the real payload shape to real primitive nodes; each golden test covers all four surfaces via the shared harness. No type is degraded now that `graph` ships ([record](./adaptive_ui_primitive_gaps.md)).
- Slack: `post_view_to_slack` is experimental-gated; Block Kit goes through `.slack2` `sendMessage`; charts go through `uploadFile` with a text fallback on failure; `files.slack.com` is called out next to `slack.com`. `RelayClient.trigger` forwards `blocks` on `POST /v1/trigger`; demo 15 uses the managed Elastic Slack app (`authType: relay`).
- Live data: `request_registered_view` looks up live events and investigations by id (demos 6–8, 14, 16). ES|QL → `render_view` compose is still the model (demo 11). Demo 13: **New chat about this event** (not the investigation restore) plus `<render_attachment>` shows Adaptive UI inline for `platform.sig_event`.
- Seam: contract is additive/opt-in; inline `getViewSpec` wins; canvas keeps `renderCanvasContent` when set. First adopter is `platform.sig_event`.
- Nightshift: `streams.significantEvent` and `nightshift.investigation` are registered views that look up live records; event CTAs open `/app/nightshift`. Demos 6–8 and 13–16 are the product demo.
