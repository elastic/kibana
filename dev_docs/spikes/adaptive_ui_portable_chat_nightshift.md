# Adaptive UI × Nightshift: portable chat demo

**Status:** current on `adaptive-ui/portable-chat-product` · **Repo:** this Kibana tree — not the Adaptive UI pack (`@elastic/adaptive-ui` / `@elastic/adaptive-ui-host-kibana`) · **Owner:** `@elastic/appex-ai-infra` (Kibana `adaptive_ui` plugin) with Nightshift / connectors · **Review:** [`adaptive_ui_portable_chat_review.md`](./adaptive_ui_portable_chat_review.md)

This branch is the honest Nightshift demo: a significant event, an investigation card that matches the flyout, Open in chat rendering Adaptive UI inline, and Slack Block Kit through the Elastic Slack app. Existing Adaptive UI primitives (`panel`, `itemList`, `codeBlock`, `table`, `badge`, `actions`) are enough; nothing here needs a pack change or a re-vendor.

Adaptive UI stays relay-free. It executes a `.slack2` connector via `post_view_to_slack`. Nightshift (or Significant Events settings) provisions that connector. File upload (`files:write` / `files.upload`) is still a Relay-shaped gap; the investigation card does not need it.

## The demo

An SRE is looking at a Nightshift significant event. They ask the agent to investigate it and share the result with the on-call channel.

1. Nightshift flyout (or Agent Builder chat opened from the event) starts an investigation for that event.
2. When it completes, chat shows an Adaptive UI card: conclusion, ranked remediations (with optional code), blind spots, and evidence (ES|QL + source-file links). Same payload as the Nightshift flyout, not a markdown restatement.
3. The agent posts that card to Slack with `post_view_to_slack`. Slack renders native Block Kit, not a blob of markdown. Charts, if any, stay on a token `.slack2`.
4. "View in Kibana" on the Slack card opens `/app/nightshift?eventUuid=…&eventId=…` onto the same flyout.

Canonical prompts, setup, and failure modes live in the review script: [demos 13–16](./adaptive_ui_portable_chat_review.md#13-open-in-chat--adaptive-ui-without-the-agent) (Open in chat, live event, Elastic Slack app, live investigation).

## What this branch ships

| Layer | This branch |
| --- | --- |
| Event card | [`streams.significantEvent`](../../x-pack/platform/plugins/shared/adaptive_ui/server/registered_views/significant_event.ts) + [`sig_event.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event.ts). Primary CTA is `/app/nightshift?eventId=…` (`eventUuid` when present). `recommendations` is `string[]`. |
| Live event attachment | [`platform.sig_event`](../../x-pack/platform/plugins/shared/significant_events_app/public/components/significant_event_attachment/significant_event_attachment.tsx) supplies `getViewSpec` via [`toSignificantEventAttachmentViewSpec`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/sig_event_attachment.ts). Inline is Adaptive UI; canvas stays native `SignificantEventDetails` (live ES\|QL). |
| Investigation card | [`toInvestigationViewSpec`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/investigation.ts), registered as `nightshift.investigation`. Prefers structured `recommendations` / `blind_spots`; else parses markdown `conclusion` (`## Next Steps`) and maps `gaps_found` the same way the Nightshift flyout used to. Panel body is prose, not the raw markdown dump. |
| Investigation API | [`GET /internal/nightshift/investigations/{id}`](../../x-pack/solutions/observability/plugins/nightshift_investigations/common/index.ts) returns `state` (the investigate step's `structured_output`) plus a derived `conclusions` string. |
| Slack transport | `post_view_to_slack` calls `.slack2` `sendMessage({ text, blocks })`. Charts still need `uploadFile` on a token connector. |
| Elastic Slack app | Managed `.slack2` with `authType: relay` ([#286929](https://github.com/elastic/kibana/pull/286929)). [`RelayClient.trigger`](../../x-pack/platform/plugins/shared/actions/server/lib/relay/relay_client.ts) forwards `blocks` on `POST /v1/trigger`. `uploadFile` stays unsupported on relay. Demo 15 uses this connector; no `xoxb-`. |

## Open in chat

Nightshift Open in chat attaches `platform.sig_event` only on **new chat** (landing-row chat icon, or flyout menu **New chat about this event**). That is a composer pill until the agent emits `<render_attachment>`; `getViewSpec` then mounts Adaptive UI as the inline body. Canvas still uses native `renderCanvasContent` (`SignificantEventDetails`). See [`adaptive_ui_attachment_body_seam.md`](./adaptive_ui_attachment_body_seam.md).

On a completed investigation, flyout **Open in chat** is a menu. The first item restores the investigation conversation (tool logs, no Adaptive UI card). The investigation **card** remains `request_registered_view` / `nightshift.investigation`. Investigation flyout Open in chat restores a conversation; it does not invent a new investigation attachment type.

## Live investigation GET

Do not rebase the structured-schema PRs onto this tree. `toInvestigationViewSpec` consumes this worktree's `InvestigationState`:

- Prefer structured `recommendations` / `blind_spots` when present (fixture + current Nightshift flyout sample).
- Else parse markdown `conclusion` and map `gaps_found: string[]` inside the adapter ([`investigation_markdown.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/investigation_markdown.ts)). The parser stays isomorphic in `@kbn/adaptive-ui-adapters`; the platform plugin does not import Nightshift UI.

Demo 16 still needs a stack that already has a completed investigation. A fresh snapshot cannot invent one.

## Slack: Elastic Slack app vs token

Demo 15 posts through the Elastic Slack app (`authType: relay`). That connector is not created by a local `yarn start` — it needs `xpack.actions.relay.url` plus `streams.significantEventsAppsEnabled` (neither is in this tree’s `kibana.dev.yml`). Skip 15 without Relay. Demo 16 still posts Block Kit through the token `.slack2` from setup 2.

Demo 10 / charts stay on a token `.slack2` with `files:write`. Relay has no file-upload path and the Slack app is not scoped `files:write`.

## Out of scope

- Rebasing [#285902](https://github.com/elastic/kibana/pull/285902) / [#286491](https://github.com/elastic/kibana/pull/286491) for a structured investigate-step schema.
- Relay `files.upload` / chart PNGs through the Slack app.
- Graph primitive for blast-radius / impacted services ([#286519](https://github.com/elastic/kibana/pull/286519)) — table/badge is enough; see [`adaptive_ui_primitive_gaps.md`](./adaptive_ui_primitive_gaps.md).
- The Kibana `adaptive_ui` plugin talking to Relay directly.
- Migrating existing sig-event investigation callers onto `nightshift_investigations`.
