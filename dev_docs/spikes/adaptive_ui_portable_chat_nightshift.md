# Adaptive UI × Nightshift: portable chat demo

**Status:** landed on this branch (N1–N4; N5 `RelayClient.trigger` with `blocks` — managed `.slack2` relay auth remains [#286929](https://github.com/elastic/kibana/pull/286929)) · **Repo:** this Kibana tree — not the Adaptive UI pack (`@elastic/adaptive-ui` / `@elastic/adaptive-ui-host-kibana`) · **Owner:** `@elastic/appex-ai-infra` (Kibana `adaptive_ui` plugin) with Nightshift / connectors · **Review:** [`adaptive_ui_portable_chat_review.md`](./adaptive_ui_portable_chat_review.md)

All of N1–N5 is Kibana (plugin adapters, registered views, `nightshift_investigations`, `.slack2` / Relay client). Existing Adaptive UI primitives (`panel`, `itemList`, `codeBlock`, `table`, `badge`, `actions`) are enough; nothing in this plan needs a pack change or a re-vendor. `elastic/relay-service` already accepts Block Kit on `POST /v1/trigger`; N5 is forwarding `blocks` from Kibana's `.slack2` relay path, not a Relay API change. File upload (`files:write` / `files.upload`) is the only Relay-shaped gap, and the investigation card does not need it.

The portable-chat branch already proves one `ViewSpec` across Kibana chat and Slack. Nightshift is the product surface that makes that proof a demo: a significant event, an investigation, and a Slack channel the on-call already connected. This file is the work to make that demo honest — not a fixture card posted with a personal bot token.

## The demo

An SRE is looking at a Nightshift significant event. They ask the agent to investigate it and share the result with the on-call channel.

1. Nightshift flyout (or Agent Builder chat opened from the event) starts an investigation for that event.
2. When it completes, chat shows an Adaptive UI card: conclusion, ranked remediations (with optional code), blind spots, and evidence (ES|QL + source-file links). Same payload as the Nightshift flyout, not a markdown restatement.
3. The agent posts that card to Slack with `post_view_to_slack`. Slack renders native Block Kit, not a blob of markdown. Charts, if any, are images.
4. "View in Kibana" on the Slack card opens `/app/nightshift?eventUuid=…&eventId=…` onto the same flyout.

Until the work below lands, the closest in-branch stand-in is review prompts 3–4 (fixture `streams.significantEvent`) and 6–7 (token `.slack2` connector). Those prove portability; they do not prove Nightshift.

## Why this is not runnable today

| Layer | Today | Demo needs |
| --- | --- | --- |
| Event card | [`streams.significantEvent`](../../x-pack/platform/plugins/shared/adaptive_ui/server/registered_views/significant_event.ts) + [`sig_event.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event.ts). CTAs go to `/app/streams/significant_events/${event_id}`. `recommendations` is `string[]`. | Nightshift flyout hrefs. Structured remediations if the event payload grows them. |
| Investigation card | No adapter, no registered view. Nightshift on this worktree still scrapes `conclusion` markdown ([`investigation_presentation.ts`](../../x-pack/solutions/observability/plugins/nightshift/public/investigation/investigation_presentation.ts)). Main has structured `recommendations` / `blind_spots` ([#285902](https://github.com/elastic/kibana/pull/285902), [#286491](https://github.com/elastic/kibana/pull/286491)). | `toInvestigationViewSpec(InvestigationState)` from the structured schema, registered as a view, golden-tested across four surfaces. |
| Investigation API | [`GET /internal/nightshift/investigations/{id}`](../../x-pack/solutions/observability/plugins/nightshift_investigations/common/index.ts) returns `conclusions?: string`. The structured state stays on the workflow step's `structured_output`. | GET returns the same `InvestigationState` the flyout already renders (summary, conclusion, recommendations, blind_spots, hypotheses/evidence). |
| Slack transport | `post_view_to_slack` needs `.slack2` `sendMessage({ text, blocks })` and `uploadFile` for charts. | Same tool, pointed at the Elastic Slack app Nightshift connected. |
| Elastic Slack app | Open [#286929](https://github.com/elastic/kibana/pull/286929) registers a managed `.slack2` with `authType: relay`. Kibana's `relay.trigger()` posts `message: input.text` only and drops `blocks`. `uploadFile` is rejected. Relay itself already accepts `blocks` on `POST /v1/trigger`. | Kibana forwards `input.blocks`. Chart images stay on a token connector (or are omitted) — Relay has no file-upload path and the Slack app is not scoped `files:write`. |

This branch's Adaptive UI stays relay-free: it executes a `.slack2` connector. Nightshift provisions that connector. The Adaptive UI tool does not need to know about Relay if the connector can carry Block Kit.

## Work

Do N1–N3 first (Kibana `adaptive_ui` plugin) — it makes the chat half of the demo, and Slack still works through a token connector. Nightshift API (N4) unblocks live compose. N5 (Kibana forwarding `blocks` through the relay `.slack2` connector) is the difference between "posted with a demo bot" and "posted through the Slack app this deployment already connected."

### N1 — Point event CTAs at the Nightshift flyout

**Where:** [`sig_event.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event.ts) `actions` items (today `/app/streams/significant_events/${event.event_id}` and `/timeline`).

**Change:** primary href `/app/nightshift?eventId=${event_id}`; include `eventUuid` when the input has it. Keep a secondary "Open in Streams" only if the management UI is still a useful fallback. Extend `SignificantEventInput` with optional `event_uuid`. [`buildNightshiftEventFlyoutShareUrl`](../../x-pack/solutions/observability/plugins/nightshift/public/common/url_params.ts) is the Nightshift-side contract (`eventUuid` required, `eventId` optional).

**Done when:** Slack/markdown/React all emit the Nightshift flyout URL; the golden test covers it; `post_view_to_slack` absolutizes it via `server.publicBaseUrl` as today.

### N2 — Investigation `ViewSpec` adapter

**Where:** new [`investigation.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src) (or `sig_event_investigation.ts`), registered in [`index.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/index.ts) `adapterGallery`, cross-surface golden test like the others.

**Input:** `@kbn/significant-events-schema` `InvestigationState` as merged to main — not this worktree's markdown-shaped conclusion. Rebase or copy the structured fields: `summary`, prose `conclusion`, `recommendations: { title, description?, code? }[]`, `blind_spots: { title, description }[]`, `hypotheses[]` with `evidence` (`description`, `esql_query`, `time_range`, `code: { source, repo, path, host?, ref? }`).

**Mapping (sketch):**

- Title: confirmed hypothesis candidate, else `summary`.
- Badges: investigation status; primary hypothesis status/confidence.
- Panel: `conclusion` (root cause).
- Item list or numbered text: remediations; `code` as `codeBlock` under the item when present (raw source, not a fenced string — [#285902](https://github.com/elastic/kibana/pull/285902)).
- Item list: blind spots.
- Table: evidence rows — description, ES|QL as `codeBlock` or a Discover `href` when `time_range` is absolute ([`buildEvidenceDiscoverParams`](../../x-pack/platform/packages/shared/kbn-investigation-output/src/evidence_links.ts)), source-file `href` from `code` when `host`+`ref` exist.
- Actions: "View in Nightshift" using N1's URL, plus "Open investigation" if a conversation/investigation id is on the input.

**Registered view:** `nightshift.investigation` next to `streams.significantEvent`, `build({ input })` over a fixture cloned from Nightshift's sample investigation, shallow-merge documented the same way as the event view.

**Done when:** `validateView` + four-surface golden test pass; prompt "render `nightshift.investigation`" produces a card that a Nightshift engineer recognizes as the flyout, not a markdown dump.

### N3 — Demo fixtures and Slack archetype

**Where:** investigation adapter sample; [`post_to_slack_demo.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts) (today only `text` / `cases` / `security.rule`); review-doc prompts.

**Change:** add `streams.significantEvent` and `nightshift.investigation` archetypes to the offline Slack script (Block Kit, no PNG — charts stay on the in-product tool). Review prompts 10–13 live in [`adaptive_ui_portable_chat_review.md`](./adaptive_ui_portable_chat_review.md#after-n1n5--how-to-demo). Detection adapter: add the ES|QL sample from [#284703](https://github.com/elastic/kibana/pull/284703) as an optional `codeBlock` when `esql_query` is on the payload.

**Done when:** `post_to_slack_demo.ts --archetype nightshift.investigation --dry-run` prints Block Kit with remediations, blind spots, and a Nightshift href.

### N4 — Investigations GET returns structured state

**Where:** [`nightshift_investigations`](../../x-pack/solutions/observability/plugins/nightshift_investigations) (relocated to platform/shared on main, [#286780](https://github.com/elastic/kibana/pull/286780)). [`NightshiftInvestigationsClient.get`](../../x-pack/solutions/observability/plugins/nightshift_investigations/server/client/investigations_client.ts) already unwraps `structured_output` and then throws away everything except `conclusion`/`summary`.

**Change:** add `state?: InvestigationState` (or the structured fields) to `GetInvestigationResponse`. Keep `conclusions` as a derived convenience string if existing callers need it. List ([#284803](https://github.com/elastic/kibana/pull/284803)) can stay summary-only.

**Done when:** a completed investigation's GET body is enough to call `toInvestigationViewSpec` with no second fetch into workflow internals. Agent compose: start or find investigation → GET → `request_registered_view` / `render_view` → optional `post_view_to_slack`.

Nightshift-owned. The Kibana `adaptive_ui` plugin should not import `workflows_management` to scrape step output.

### N5 — Kibana's relay `.slack2` forwards Block Kit

**Where:** Kibana, not `elastic/relay-service`. Relay already takes optional `blocks` on `POST /v1/trigger` and posts them via `chat.postMessage` (`src/contracts/http/slack.ts`, `src/routes/trigger.ts`). Open [#286929](https://github.com/elastic/kibana/pull/286929) `relaySendMessage` calls `relay.trigger({ tenantKey, channel, message: input.text, threadTs? })` and drops `input.blocks`. This worktree's `RelayClient` has no `trigger()` at all. `uploadFile` is in the unsupported-action set.

**Change:**

1. Add `trigger({ tenantKey, channel, message, threadTs?, blocks? })` on Kibana's `RelayClient` (snake_case `tenant_key` / `thread_ts` / `blocks` on the wire). Forward `input.blocks` next to `text` as `message`.
2. Confirm the managed `.slack2` instance is what `post_view_to_slack` already selects (`connectorId` from the connector attachment, `listChannels` / `resolveChannelId` against connected channels — Relay lists bindings, which is the right allow-list for the demo).
3. Do not wait on Relay file upload. The Slack app scopes are `chat:write` (plus mentions/channels/reactions/users); architecture mentions `files:read` for inbound attachments, not `files:write`. The investigation card has no charts. `post_view_to_slack`'s existing text fallback covers a spec that does include a donut.

**Caveats (Relay, already true):** `message` is required (Adaptive UI always sends fallback `text`). Channel must be bound to this deployment (`403` otherwise — the demo posts to a Nightshift-connected channel). Malformed `blocks` that fail Relay's `type: string` check are dropped silently rather than `400`'d, so a bad payload would land as text-only. Slack's 50-block / `msg_blocks_too_long` limits still apply; Relay maps those to payload rejection.

**Done when:** connecting Slack from Significant Events settings, adding that connector to the agent, and running prompt 11 posts a Block Kit card to a connected channel. No `xoxb-` token.

Connectors-owned (Kibana `#286929`). `post_view_to_slack` changes nothing if the connector honors the existing `sendMessage({ text, blocks, threadTs })` contract.

### Out of scope

- Wiring the `getViewSpec` body seam for `platform.sig_event` — the registered view + `render_view` path is enough for the demo; the seam is still a proposal ([`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md)).
- Graph primitive for blast-radius / impacted services ([#286519](https://github.com/elastic/kibana/pull/286519)) — table/badge is enough; see [`adaptive_ui_primitive_gaps.md`](./adaptive_ui_primitive_gaps.md).
- The Kibana `adaptive_ui` plugin talking to Relay directly. This branch's "no relay" scope stays; N5 is a `.slack2` connector hole (forward `blocks`), not a new transport, not an Adaptive UI pack change, and not a Relay API change.
- Growing Relay `files.upload` / `files:write` for chart PNGs. Optional later; the Nightshift investigation card does not need it.
- Migrating existing sig-event investigation callers onto `nightshift_investigations` (Nightshift's own follow-up).

## Demo script

Canonical prompts, setup, and failure modes after N1–N5 live in the review: [After N1–N5 — how to demo](./adaptive_ui_portable_chat_review.md#after-n1n5--how-to-demo) (prompts 10–13). Token `.slack2` (review prompts 6–7) remains valid until N5; charts stay on that path even after N5.
