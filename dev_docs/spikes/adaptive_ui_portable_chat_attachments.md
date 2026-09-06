# Review script: Adaptive UI attachment replacements (`adaptive-ui/portable-chat-product`)

**Status:** current on this worktree · **Source:** [21322f107897](https://github.com/elastic/kibana/commit/21322f107897068d9748ec3920f4d98a8cf79f2a) (`to<Type>ViewSpec` adapters) plus this branch’s `getViewSpec` seam · **Product chat / Slack / Nightshift loop:** [`adaptive_ui_portable_chat_review.md`](./adaptive_ui_portable_chat_review.md)

This is a walkthrough of **native Agent Builder attachments rendering with Adaptive UI**. Each numbered chat demo is a **new Agent Builder conversation** — do not continue a prior demo’s thread. A demo may take several tool calls in that one conversation. Setup rows below are prerequisites, not a run order among demos.

The agent creates a **native** type (`text`, `esql`, `case`, `security.rule`, …) via `attachment_add` or Open in chat. Inline chat then mounts that type’s `getViewSpec` through Adaptive UI. Chrome (label, badges, Run/Copy/Preview) stays native. Do **not** call `render_view` or `request_registered_view` for these cards — those tools persist a parallel `platform.adaptiveUi.view` attachment, which is not the replacement.

`request_registered_view` remains the product path for **code-owned views** (`streams.significantEvent`, `nightshift.investigation`) in the portable-chat review. `platform.sig_event` in *this* script is the Nightshift Open-in-chat attachment, which is readonly.

Background is in [Appendix](#appendix).

## How far to go

Each chat demo is independent once its setup row is done. Skip any demo you do not need.

| Stop after | Unlocks |
| --- | --- |
| Setup 0 | Demos 1–2 (offline, no stack) |
| + Setup 1 | Demos 3–11 (chat: native types with Adaptive UI bodies) |
| + Setup 2 | Demo 12 (Nightshift Open in chat: `platform.sig_event`, detection, KI) |

**Short review:** Setup 0–1, demos 1, 3–8. **Charts:** add 11. **Open in chat:** add Setup 2 and demo 12.

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

If a prompt is answered as prose instead of a tool call, the tools may not be allow-listed for that agent. Confirm `attachment_add` is enabled. Adaptive UI tools (`render_view`, `request_registered_view`) are **not** the path for these demos.

### 2. Nightshift (demo 12)

Same as the [portable-chat review setup 4](./adaptive_ui_portable_chat_review.md#4-nightshift-seed-demo-13): seed events so flyout **Open in chat** can attach `platform.sig_event`. Detection / KI flyouts attach the readonly types.

---

## Demos

Start a **new** Agent Builder conversation for each numbered chat demo. Paste the prompt as written. After a tool call, the agent should render with `<render_attachment>` and **not** restate the card as prose.

Expect the **native attachment type** in the tool result (`text`, `esql`, `case`, …), not `platform.adaptiveUi.view`. The body is Adaptive UI; the header and action buttons are the type’s existing chrome.

### 1. Every replacement is a portable spec

**Need:** setup 0. **Proves:** each adapter’s fixture `ViewSpec` validates and renders as GitHub markdown (and one as Slack Block Kit) without booting Kibana.

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts
```

**Expect:** one valid spec per Figma type, with no adapter flagged as a degraded render. Markdown describes `donut` / `timeSeries` / `graph` as text; React is demo 12.

### 2. Replacement Block Kit without posting

**Need:** setup 0. **Proves:** a case list and a detection rule are Block Kit, not a blob of markdown. No token.

```bash
node --require ./src/setup_node_env \
  x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
  --archetype cases --dry-run
```

**Expect:** Block Kit JSON for the `cases` adapter. Live `post_view_to_slack` still requires a `platform.adaptiveUi.view` attachment (portable-chat review); native types with `getViewSpec` are not posted by that tool.

### 3. Tools are allow-listed

**Need:** setup 1. **Proves:** Adaptive UI tools exist if you need them later. This demo is a smoke test, not an attachment replacement.

```text
Use the get_authoring_context tool and list the Adaptive UI primitives available for authoring a view.
```

**Expect:** a primitive catalog, not a guessed list. Confirm `donut`, `timeSeries`, `diff`, `itemList`, `contextStrip`, and `callout` are in it.

### 4. Recovery note (`text`)

**Need:** setup 1. **Proves:** native `text` attachment, Adaptive UI markdown body instead of `EuiCodeBlock`.

````text
Attach this operator note as a `text` attachment, then render it with <render_attachment>. Do not dump the note back as prose.

Restarting the ingest pipeline cleared the backlog on `agent.node-2`. The two data nodes that were behind on indexing have caught up; monitor `logs-000042` for recurrence over the next hour.

```log
[12:03:58] WARN  ingest: queue depth 18211 exceeds soft limit
[12:04:01] INFO  ingest: draining queue for logs-000042
[12:04:02] INFO  ingest: pipeline "logs-default" restarted
[12:04:03] INFO  ingest: queue depth 0
[12:04:03] INFO  ingest: backlog cleared in 4.2s
[12:04:04] INFO  ingest: steady state
```
````

**Expect:** `attachment_add` type `text`. `agent.node-2` / `logs-000042` as inline code and the six log lines as a fenced region. Copy stays on the native chrome. Failure: `render_view` / `request_registered_view`, or a `platform.adaptiveUi.view` attachment.

### 5. Saved ES|QL (`esql`)

**Need:** setup 1. **Proves:** native `esql` attachment; `toEsqlViewSpec` keeps the description the native inline dropped.

```text
Attach this hunt query as an `esql` attachment and render it with <render_attachment>. Do not execute it. Do not restate the query as a markdown fence.

{"description":"Top 5 hosts by failed authentications in the last 24 hours.","query":"FROM logs-auth-*\n| WHERE event.outcome == \"failure\"\n| STATS failures = COUNT(*) BY host.name\n| SORT failures DESC\n| LIMIT 5"}
```

**Expect:** type `esql`, title **ES|QL query**, the description as prose, then a highlighted `FROM logs-auth-*` block. Run and Copy remain native.

### 6. Open a case (`case`)

**Need:** setup 1. **Proves:** native `case` attachment via `toCaseViewSpec`.

```text
Open this Elastic case in the conversation as a `case` attachment, then render it with <render_attachment>. Do not invent fields. Do not summarize the case as markdown.

{"id":"101","incremental_id":101,"title":"Suspicious PowerShell on finance hosts","description":"Encoded command lines observed on four hosts in the finance subnet. Two have since been isolated.","status":"in-progress","severity":"high","totalAlerts":24,"totalComment":8,"total_observables":5,"tags":["windows","execution"],"owner":"securitySolution","assignees":[{"uid":"drew"},{"uid":"sam"}],"category":"Endpoint","connector_name":"Elastic Cloud","created_at":"2026-08-19T14:00:00.000Z","updated_at":"2026-08-19T15:04:00.000Z","url":"/app/security/cases/101"}
```

**Expect:** type `case`. `#101 Suspicious PowerShell on finance hosts`, In-progress / High badges, 24 / 8 / 5 stats, **Go to case** → `/app/security/cases/101`.

### 7. Case queue (`cases`)

**Need:** setup 1. **Proves:** native `cases` collection via `toCasesViewSpec`.

```text
Show my finance-subnet case queue as a `cases` attachment, then render it with <render_attachment>. Do not turn it into a markdown bullet list.

{"total":3,"url":"/app/security/cases","cases":[{"id":"101","incremental_id":101,"title":"Suspicious PowerShell on finance hosts","description":"Encoded command lines observed on four hosts in the finance subnet. Two have since been isolated.","status":"in-progress","severity":"high","totalAlerts":24,"totalComment":8,"owner":"securitySolution","tags":["windows"],"created_at":"2026-08-19T14:00:00.000Z","updated_at":"2026-08-19T15:04:00.000Z","url":"/app/security/cases/101"},{"id":"98","incremental_id":98,"title":"Failed logins from unfamiliar ASN","description":"Rate-limited at the edge; no successful authentication.","status":"open","severity":"low","totalAlerts":3,"totalComment":1,"owner":"securitySolution","tags":[],"created_at":"2026-08-18T09:00:00.000Z","updated_at":"2026-08-18T09:00:00.000Z"},{"id":"95","incremental_id":95,"title":"Data exfiltration signature on egress gateway","description":"Matched two DLP rules; awaiting analyst triage.","status":"open","severity":"medium","totalAlerts":11,"totalComment":0,"owner":"securitySolution","tags":[],"created_at":"2026-08-17T11:00:00.000Z","updated_at":"2026-08-17T11:00:00.000Z"}]}
```

**Expect:** type `cases`. Three rows (`#101` High, `#98` Low, `#95` Medium) with alert/comment pills and **Open case** actions.

### 8. Detection rule that fired (`security.rule`)

**Need:** setup 1. **Proves:** native `security.rule` (stringified `RuleResponse` in `text`).

```text
The PowerShell case was opened from this detection rule. Attach it as a `security.rule` attachment (data.text is the stringified rule JSON) and render with <render_attachment>. Do not restate the query as markdown.

{"text":"{\"name\":\"Encoded PowerShell execution\",\"type\":\"query\",\"severity\":\"high\",\"risk_score\":73,\"description\":\"Flags powershell.exe invocations that carry an encoded command line.\",\"query\":\"process.name : \\\"powershell.exe\\\" and process.args : (\\\"-enc\\\" or \\\"-EncodedCommand\\\")\",\"language\":\"kuery\",\"index\":[\"logs-*\",\"winlogbeat-*\"],\"tags\":[\"Windows\",\"Execution\",\"Elastic\"],\"threat\":[{\"technique\":[{\"id\":\"T1059.001\",\"name\":\"PowerShell\"}]}]}","attachmentLabel":"Encoded PowerShell execution"}
```

**Expect:** type `security.rule`. **Encoded PowerShell execution**, Severity | Risk score, highlighted KQL, MITRE `T1059.001`. Native rule actions stay on the chrome.

### 9. Checkout alert and who it pages

**Need:** setup 1. **Proves:** native `platform.alerting.rule` then `platform.alerting.action_policy`. Same conversation.

```text
Checkout 5xx just tripped this alerting v2 rule. Attach it as a `platform.alerting.rule` attachment and render with <render_attachment>. Do not restate the rule as markdown.

{"kind":"alert","metadata":{"name":"High error rate on checkout","description":"Alerts when the 5xx rate on the checkout service exceeds 5% over a 5-minute window.","tags":["checkout","availability"],"builder_type":"threshold"},"time_field":"@timestamp","schedule":{"every":"1m"},"enabled":true,"query":{"format":"standalone","breach":{"query":"FROM metrics-checkout-* | STATS error_rate = AVG(http.5xx_ratio) BY service.name"}}}
```

```text
Now attach the action policy that pages on-call for that rule as a `platform.alerting.action_policy` attachment, then <render_attachment>.

{"name":"Page on-call for critical checkout alerts","description":"Routes critical checkout alerts to a workflow.","matcher":"kibana.alert.severity: critical AND service.name: checkout","group_by":["service.name","host.name"],"grouping_mode":"per_field","throttle":{"interval":"10m"},"destinations":[{"type":"workflow","id":"wf-checkout-oncall"}],"tags":["checkout","oncall"],"enabled":true}
```

**Expect:** types `platform.alerting.rule` and `platform.alerting.action_policy`. Enabled rule “High error rate on checkout” with the ES|QL query; then the policy with throttle 10m and one destination. Preview still opens the native canvas.

### 10. On-call workflow, then a proposed edit

**Need:** setup 1. **Proves:** native `workflow.yaml` and `workflow.yaml.diff`. Same conversation. Canvas stays Monaco.

```text
Attach this workflow as a `workflow.yaml` attachment and render with <render_attachment>. Do not paste the YAML back as a markdown code block.

{"name":"Enrich and notify on new critical alert","yaml":"name: Enrich and notify on new critical alert\ntags:\n  - security\n  - enrichment\ntriggers:\n  - type: alert\n    filter: \"kibana.alert.severity: critical\"\nsteps:\n  - name: enrich-host\n    type: http\n  - name: post-to-slack\n    type: slack\n  - name: open-case\n    type: cases"}
```

```text
Show the pending edit as a `workflow.yaml.diff` attachment, then <render_attachment>.

{"name":"Enrich and notify on new critical alert","status":"pending","proposalId":"proposal-open-case","beforeYaml":"steps:\n  - name: enrich-host\n    type: http\n  - name: post-to-slack\n    type: slack","afterYaml":"steps:\n  - name: enrich-host\n    type: http\n  - name: post-to-slack\n    type: slack\n  - name: open-case\n    type: cases"}
```

**Expect:** types `workflow.yaml` / `workflow.yaml.diff`. Definition card with Triggers 1 / Steps 3. Diff card shows added `open-case`. Preview still opens the native YAML editor.

### 11. Entity analytics for the finance hosts

**Need:** setup 1. **Proves:** native `security.entity_analytics_dashboard` (`donut`) and `security.entity_risk_score_history` (`timeSeries`). Same conversation. Canvas stays the native dashboard / flyout.

```text
Pull entity analytics for the finance subnet into this thread as a `security.entity_analytics_dashboard` attachment, then <render_attachment>. Do not invent extra entities.

{"summary":"Risk is concentrated in the finance subnet: three hosts and two users crossed the critical threshold in the last 24 hours.","severity_count":{"Critical":5,"High":12,"Moderate":34,"Low":88,"Unknown":0},"entities":[{"entity_type":"host","entity_id":"finance-db-01","entity_name":"finance-db-01","risk_score_norm":96,"risk_level":"Critical"},{"entity_type":"user","entity_id":"a.wong","entity_name":"a.wong","risk_score_norm":91,"risk_level":"Critical"},{"entity_type":"host","entity_id":"finance-web-03","entity_name":"finance-web-03","risk_score_norm":74,"risk_level":"High"}],"anomaly_highlights":[{"title":"Unusual process on finance-db-01","body":"Encoded PowerShell not seen on this host in the trailing 30 days."},{"title":"Impossible travel for a.wong","body":"Sign-ins from two regions 400ms apart."}]}
```

```text
Now attach the risk-score history for finance-db-01 as a `security.entity_risk_score_history` attachment, then <render_attachment>.

{"attachmentLabel":"host: finance-db-01","identifierType":"host","identifier":"finance-db-01","entityStoreId":"finance-db-01","from":"2026-08-13T00:00:00.000Z","to":"2026-08-19T00:00:00.000Z","bucketInterval":"1d","entries":[{"@timestamp":"2026-08-13T00:00:00.000Z","calculated_score_norm":41,"calculated_level":"Moderate"},{"@timestamp":"2026-08-14T00:00:00.000Z","calculated_score_norm":48,"calculated_level":"Moderate"},{"@timestamp":"2026-08-15T00:00:00.000Z","calculated_score_norm":55,"calculated_level":"Moderate"},{"@timestamp":"2026-08-16T00:00:00.000Z","calculated_score_norm":63,"calculated_level":"Moderate"},{"@timestamp":"2026-08-17T00:00:00.000Z","calculated_score_norm":78,"calculated_level":"High"},{"@timestamp":"2026-08-18T00:00:00.000Z","calculated_score_norm":89,"calculated_level":"High"},{"@timestamp":"2026-08-19T00:00:00.000Z","calculated_score_norm":96,"calculated_level":"Critical"}]}
```

**Expect:** types `security.entity_analytics_dashboard` and `security.entity_risk_score_history`. Risk-level stats plus a `donut` (5 / 12 / 34 / 88) and `finance-db-01` at 96 Critical; then an area `timeSeries` ending at 96. Expand canvas — native Security UI, not Adaptive UI.

### 12. Open in chat (`platform.sig_event`, detection, KI)

**Need:** setup 2. **Proves:** readonly Nightshift types attach natively and render Adaptive UI. Do not `attachment_add` these — they are read-only.

From a seeded significant event, flyout **Open in chat** (new conversation). After the agent emits `<render_attachment>`:

**Expect:** type `platform.sig_event`. Adaptive UI body (status/severity badges, summary, Nightshift href). Canvas still runs live ES|QL via `SignificantEventDetails`.

From a detection flyout and a KI feature flyout, Open in chat the same way.

**Expect:** `platform.sig_event_detection` / `platform.ki_feature` cards with Adaptive UI bodies (those types were header-only before this branch).

---

## Appendix

### Why not `request_registered_view`?

`platform.adaptiveUi.view` is a **new, parallel** attachment type. Native `case` / `esql` / `security.rule` cards used `renderInlineContent` until this branch set `getViewSpec` on those types. Registering Figma fixtures as viewIds, or merging `input` over samples (`buildFromInput`), would demo a second path sitting alongside the native types — not the types themselves rendering Adaptive UI.

On this branch, `getViewSpec` wins over `renderInlineContent` for the inline body. Canvas keeps `renderCanvasContent` when that is set.

### What 21322f delivered

A pure `to<Type>ViewSpec(data): ViewSpec` adapter plus a cross-surface golden test per presentational Agent Builder attachment type behind the Figma live examples, in [`@kbn/adaptive-ui-adapters`](../../x-pack/platform/packages/shared/adaptive-ui-adapters) with no `agent_builder` core changes. Listed as `adapterGallery` in [`index.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/index.ts).

This branch mounts those adapters on the native UI definitions via `getViewSpec`. See [`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md).

### Figma type → native attachment → adapter

| Figma type | Native type | Inline body | Canvas |
| --- | --- | --- | --- |
| `text` | `text` | Adaptive UI | — |
| `esql` | `esql` | Adaptive UI | — (Run/Copy native) |
| `case` | `case` | Adaptive UI | — |
| `cases` | `cases` | Adaptive UI | — |
| `security.rule` | `security.rule` | Adaptive UI | native actions |
| `platform.alerting.rule` | `platform.alerting.rule` | Adaptive UI | native form |
| `platform.alerting.action_policy` | `platform.alerting.action_policy` | Adaptive UI | native form |
| `workflow.yaml` | `workflow.yaml` | Adaptive UI | Monaco |
| `workflow.yaml.diff` | `workflow.yaml.diff` | Adaptive UI | — |
| `platform.sig_event` | `platform.sig_event` | Adaptive UI | `SignificantEventDetails` |
| `platform.sig_event_detection` | `platform.sig_event_detection` | Adaptive UI | — |
| `platform.ki_feature` | `platform.ki_feature` | Adaptive UI | — |
| `security.entity_analytics_dashboard` | `security.entity_analytics_dashboard` | Adaptive UI | native dashboard |
| `security.entity_risk_score_history` | `security.entity_risk_score_history` | Adaptive UI | native flyout |
| `skill` | `skill` | **native** (create/save) | — |
| `connector_setup` | `connector_setup` | **native** (connect flow) | — |
| `graph` | `graph` | **native** (React Flow) | — |
| `observability.service-map` | `observability.service-map` | **native** | — |

Adapters for `skill`, `connector_setup`, `graph`, and `observability.service-map` still exist for Slack/markdown (demo 1). Interactive inline stays native.

**Out of scope (live-fetch types):** `security.rule.preview`, `security.entity`, `security.entity_graph`, `platform.dashboard.dashboard_state` panel data, `visualization` chart data, and `platform.sig_event` ES|QL log rows (canvas).

### Automated checks

```bash
node scripts/jest --config x-pack/platform/plugins/shared/adaptive_ui/jest.config.js
node scripts/jest x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/attachments/inline_attachment_with_actions.test.tsx
node scripts/jest x-pack/platform/plugins/shared/significant_events_app/public/components/significant_event_attachment/significant_event_attachment.test.tsx
```

Each adapter suite asserts `validateView`, all four surfaces via [`cross_surface.test.helpers.tsx`](../../x-pack/platform/plugins/shared/adaptive_ui/public/renderers/cross_surface.test.helpers.tsx), and the expected data in the React tree.

### Caveats

- **These payloads are the native attachment `data` shapes, not live fetches.** A real Cases/Security tool would return the same shapes; this stack may have none of those objects.
- **Do not use `render_view` or `request_registered_view` here.** `render_view` is model-authored specs (portable-chat review demo 5). `request_registered_view` is code-owned views (`streams.significantEvent`, `nightshift.investigation`).
- **`post_view_to_slack` does not accept native types.** It requires a `platform.adaptiveUi.view` attachment. Block Kit for these replacements is demo 2.
- **Graph / service-map stay native in chat.** Their adapters draw a real `graph` diagram for markdown, React, and (with asset collection) a Slack PNG, but the interactive React Flow canvas stays the in-product experience.
- **`skill` and `connector_setup` stay native in chat.** Interactive connect and tool execution are not Adaptive UI.

### Reviewer checklist

- Every Figma type from 21322f has a `to<Type>ViewSpec` and an `adapterGallery` entry.
- Presentational types set `getViewSpec` on the native UI definition. Interactive types (`graph`, `skill`, `connector_setup`) do not.
- Chat prompts create the **native** type, then `<render_attachment>`. Tool results are not `platform.adaptiveUi.view`.
- Canvas still uses `renderCanvasContent` where that is set (alerting, workflows, sig_event, entity analytics).
- Slack: demo 2 dry-run; live post is the portable-chat review.
