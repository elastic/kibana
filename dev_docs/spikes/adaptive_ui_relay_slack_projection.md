# The whole Slack message, both ways: Relay ⇄ Agent Builder

**Status:** buckets A, B1, B2, C1, C2, and C3 implemented (PoC). B3 is the remaining outbound gap and needs Relay sign-off first.
**Surfaces:** Agent Builder callback converse, Adaptive UI, Relay (`elastic/relay-service`).
**Scope:** not in the portable-chat demo requirements. This is the follow-up the Relay/AB round-trip critique is actually asking for.

> **Implemented across two repos.** Kibana work is on `adaptive-ui/relay-slack-projection`. Relay work is on two independent branches in `elastic/relay-service`: `feat/kibana-surface-projection` (outbound Block Kit + charts) and `feat/slack-mrkdwn-normalization` (inbound prose). The outbound round-trip now works end to end: Kibana composes and projects, Relay uploads assets and posts. See [Built so far](#built-so-far).

## Status TL;DR

**Everything but B3 is built and verified end-to-end.**

Outbound (AB → Slack): Kibana resolves attachment tags, composes the full reply into a `ViewSpec`, projects it to Slack Block Kit with `renderSlack`, rasterizes chart nodes to PNG at 2× density, and ships blocks + asset bytes on `projection.slack`. Relay uploads the PNGs, rewrites `slack_file` refs to file ids, and posts the blocks. Markdown is the fallback at every stage — a failed rasterization, a payload-too-large chart set, or a malformed block all degrade gracefully rather than costing the answer.

Inbound (Slack → AB): Relay normalizes Slack mrkdwn to standard Markdown before AB sees it — mentions resolved to display names, links unwrapped, HTML entities decoded, code blocks preserved. The AB transcript shows who asked and from which surface.

**What remains:**

- **B3 (per-message granularity):** One Slack message per assistant `message_complete`, not just the terminal one. Needs joint Relay design sign-off on `message_key → ts` semantics before code. See [Bucket B](#bucket-b--lockstep-with-relay).
- **HITL bridging:** Replies typed in the Kibana AB UI for a Slack-originated conversation do not return to Slack. The callback is per-execution: Relay submits each turn with `callback.url = relay/v1/events`; the Kibana UI does not, so `deliverCallbackEvents` exits immediately for UI-initiated turns. Fixing this requires either storing the Relay callback URL on the conversation or a push path from Kibana back through Relay. See [Later, not this feature](#later-not-this-feature).
- **Inbound files:** Slack file references dropped by Relay; a named `slack.file` attachment type and resolver are needed before implementation.
- **`format()` fallback:** Unresolvable native-type tags degrade to a stub. Wiring `format()` is deferred to A2 follow-up.
- **Canonical spec registry:** Server map is still hand-maintained, held at parity with `adapterGallery` by a CI test.

## TL;DR

**Outbound (AB → Slack) — today:**

1. **AB → Relay:** AB sends a raw markdown string containing `<render_attachment id="…" />` tags. Relay posts it verbatim.
2. **Relay → Slack:** Slack renders the literal tag text. The attachment never arrives.

**Outbound — Bucket A (Kibana only, no Relay change):**

1. **AB → Relay:** AB's callback delivery resolves each `<render_attachment>` tag in `response.message` server-side, substituting rendered markdown in place of the tag. Raw tags no longer reach Relay.
2. **Relay → Slack:** Relay posts the substituted markdown string as it does today. No Block Kit yet.

**Outbound — Bucket B (requires Relay release):**

1. **AB → Relay:** AB composes the full reply (prose + attachment specs) into a `ViewSpec`, calls `renderSlack`, and attaches `{ text, blocks }` to the callback payload as `projection.slack`.
2. **Relay → Slack:** Relay prefers `projection.slack.blocks`, appends its footer, and calls `chat.postMessage`. Slack renders Block Kit.

**Inbound (Slack → AB) — today:**

1. **Slack → Relay:** Slack sends `event.text` (Slack mrkdwn) plus optionally `event.blocks` and file refs.
2. **Relay → AB:** Relay extracts only `event.text` as a plain string. Mentions are unresolved, links are raw, files are dropped.
3. **AB → model:** The model reads degraded mrkdwn. `origin`, `external_conversation_id`, and `author` are persisted on the round but nothing uses them.

**Inbound — Bucket C (Relay + Kibana, independent):**

1. **Slack → Relay:** unchanged.
2. **Relay → AB:** Relay normalizes `event.text` (mention resolution, link unwrap, entity decode) and passes file refs as `attachments`. AB already accepts `attachments` — no wire change needed on the AB side.
3. **AB → Kibana UI:** The round-input bubble renders `author.full_name`, an origin badge, and file chips. The data is already persisted; this is a pure UI change.

The two directions are different problems. Outbound pivots on `ViewSpec` and `renderSlack`. Inbound pivots on normalization at the Relay seam — no new abstraction needed, since the AB conversation data model already persists `origin`, `author`, and `external_conversation_id`.

## Built so far

| Step | What landed | Where |
| --- | --- | --- |
| A1 | Render tags substituted into the markdown Relay already posts | `adaptive_ui/server/surface/project_reply.ts` |
| A2 | Adapter map parity with `adapterGallery` fails CI on drift | `adaptive_ui/server/surface/attachment_view_specs.test.ts` |
| B1 | Whole reply composed into one `ViewSpec`, projected with `renderSlack` | `adaptive_ui/server/surface/compose_reply.ts` |
| B2 (Kibana) | `projection.slack` on the callback payload | `agent_builder/common/http_api/chat_callback.ts` |
| B2 (Relay) | Prefers the projection over the markdown wrap | `src/outbound/slack-renderer.ts` |
| C1 | Slack mrkdwn normalized to Markdown, mentions resolved | `src/surfaces/slack/mrkdwn.ts` |
| C2 | Transcript names the asker and the surface | `agent_builder/…/round_input_attribution.tsx` |
| C3 | Chart PNGs rasterized at 2× density, uploaded by Relay, refs resolved before post | `adaptive_ui/server/slack/render_png.ts`, `src/surfaces/slack/chart-assets.ts` |

Four findings from building it, none of which change the plan's shape:

- **The tag parse is now shared by both server consumers.** `parse_reply.ts` owns the pattern, the attribute read, and tag-to-spec resolution; the markdown projection and the composer are two callers. The divergence from the remark plugin's parser still stands.
- **`format()` fallback is still not wired**, as [Resolving attachments to specs](#resolving-attachments-to-specs) says. An unresolvable tag degrades to a stub in both projections.
- **A rejected projection now retries as markdown** before Relay's canned notice. The plan flagged malformed Block Kit as costing the whole answer; that is now a formatting loss instead.
- **C3 landed as part of B2, not separately.** Charts were implemented in the same pass as Block Kit projection. `assets` travels alongside `blocks` on `projection.slack`; Relay uploads each PNG, polls `files.info` for readiness, and rewrites `slack_file.ref` to the uploaded id before calling `toPostableBlocks`. An `image` block with an unresolved `ref` is treated as invalid and drops the whole projection to markdown, which is the correct failure mode.

Deliberately still not built: B3 (per-message projection) and inbound files.

---

The demo shipped on this branch — AB → Slack via `post_view_to_slack` and the attachment share menu — is a *user action*. A person clicks **Send to Slack**. The critique is right that this does nothing for the Slack thread itself.

> Vignesh: *"Rendering has to be a native component of the AB conversation model. It won't happen based on a user action per turn. AB has to understand the origin of the conversation … and model the output in such a way that its rendering is automagic."*

> Pierre, on the same path: *"(1) Slack → (2) Relay → (3) AB HTTP converse API → (4) Relay → (5) Slack … no UI … we need to convert that to whatever that adaptive UI thing is doing before it gets back to Slack (5)."*

Both describe the same missing piece at **(4)**: a projector, triggered by `origin`, that turns the agent's *entire* reply into a Slack message. This doc plans that projector plus the inbound half. It also argues the two halves are **not** the same kind of problem.

> **Relay side: verified against `elastic/relay-service@main`, not assumed.** Every claim below was checked in source. The table in [Relay, verified](#relay-verified) records what held, what was wrong, and the three findings that changed this plan. Kibana-side seams are verified against this worktree and cited inline.

## The two directions are different problems

| | Inbound — Slack → AB | Outbound — AB → Slack |
| --- | --- | --- |
| Problem | Ingestion / normalization | Projection / rendering |
| Pivot | The round model AB already has | `ViewSpec` |
| Adaptive UI role | Mostly none | Central |
| Primary owner | Relay (prompt) + Kibana UI (transcript) | Kibana (compose + project) + Relay (post) |

Inbound pivots on structures AB already persists: `ConversationRoundOrigin`, `ConversationRoundAuthor`, and `attachment_refs`. Outbound pivots on the reply *becoming* a `ViewSpec`, then `renderSlack`.

Vignesh's *"we have the conversation data model already done in AB via `origin` — so it exists"* is precisely why inbound needs no new abstraction. `ConversationRound.origin` and `ConversationRound.author` are already persisted ([`conversation.ts:419-422`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/conversation.ts)). `callbackConversePayloadSchema` already accepts `origin.type`, `origin.external_conversation_id`, and `origin.author` ([`chat.ts:301-323`](../../x-pack/platform/plugins/shared/agent_builder/server/routes/chat.ts)). `origin.type` is now read by the surface projection gate (Bucket A); the Kibana transcript UI does not yet render the persisted `origin` or `author` on the round-input bubble.

Resisting symmetry is the point. A text bubble with an avatar and file chips is React chrome, and wrapping it in a spec buys nothing. The one narrow exception is recorded under [Inbound](#inbound-slack--agent-builder).

---

## Outbound: the entire reply, one Slack message per assistant message

### Problem

Relay submits a turn with `POST /internal/agent_builder/converse/callback`. It later receives Agent Builder chat events on `POST {relay}/v1/events`. The terminal `round_complete` event carries `round.response.message`, a markdown string. A typical Adaptive UI reply looks like this:

```text
Sure, here is the investigation.

<render_attachment id="a1b2c3" version="1" />
```

In Kibana chat, [`ChatMessageText`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/chat_message_text.tsx) and [`render_attachment_plugin.tsx`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/markdown_plugins/render_attachment_plugin.tsx) parse those tags and mount Adaptive UI (or native chrome) inline. That UI does not exist on the Relay path.

Relay's Slack renderer takes `response.message` as a string. It posts that string as a Slack `markdown` block plus a "View in Kibana" footer. Slack therefore shows the tag literally, and the view never arrives.

The ask is not "post the attachment somehow." It is that **prose plus every inline render** must become a Slack message before step (5), using the same projection the demo already uses for a single view.

```text
(1) Slack  →  (2) Relay  →  (3) AB converse/callback  →  (4) Relay  →  (5) Slack
                                                      ▲
                                                      no browser; tags stay tags
```

### What exists today

Three outbound Slack paths. None of them is this projector.

| Path | Who posts | What gets posted |
| --- | --- | --- |
| Kibana chat UI | n/a (on-screen) | Markdown AST + mounted `ViewSpec`s |
| `post_view_to_slack` / share menu | Kibana via `.slack2` `sendMessage` | `renderSlack(one ViewSpec)` |
| Relay `renderFinal` | Relay via Slack Web API | `response.message` as `markdown` |

The chat UI path is browser-only. The connector path is an opt-in tool or button, takes one spec, goes through a connector rather than Relay, and is a *second* post rather than a replacement for Relay's final message. Relay's own path does no tag parsing, no `ViewSpec` resolution, and no Block Kit.

The Kibana connector path already has the whole pipeline in [`post_view.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/server/slack/post_view.ts): `absolutizeViewSpecHrefs` → `renderSlack(spec, { collectAssets: true })` → rasterize charts → `uploadFile` → `sendMessage`. It is simply not wired to converse/callback. `RelayClient.trigger` already forwards `blocks` on `POST /v1/trigger`, but that is the proactive connector direction, not the reactive reply.

### Relay, verified

Read against `elastic/relay-service@main`. The wire contract is documented in [kibana#280255](https://github.com/elastic/kibana/pull/280255) and mirrored in Relay's `test/ab-stub/types.ts`.

| Claim | Verdict | Source |
| --- | --- | --- |
| Callback parser keeps only `response.message` from `round_complete` | Confirmed | `completed` notification shape |
| Unknown top-level fields are dropped | Confirmed, and safely | `inspectConverseCallbackNotification` |
| `message_complete` never reaches Slack | Confirmed | parser activity group |
| Progress does not post messages | Confirmed, and narrower than assumed | `slack-renderer.ts` |
| `awaiting_prompt` → `needs_input` | Confirmed | parser |
| No `files:write` on the Slack app | Confirmed | `src/config.ts` |

Details behind those verdicts:

- The `completed` notification is `{kind, execution_id, event_type, idempotency_key, message}`. Nothing else survives.
- Extra top-level keys are *ignored*, not rejected. The `unexpected_field` rejection fires only for `idempotency_key` on a non-terminal event.
- `message_complete` parses to activity-only, alongside `tool_progress`, `reasoning`, and `tool_result`.
- `renderProgress` only sets a Slack *thread status* to the current tool label. This is deliberate: *"Tool parameters, results, and model reasoning remain private."*
- The app's scopes are `app_mentions:read`, `channels:read`, `chat:write`, `reactions:write`, and `users:read`.

Three findings changed the plan.

**1. Relay already posts a `blocks` array.** `renderFinal` sends `blocks: [{ type: 'markdown', text: answer }, ...footer]`. B2 is therefore not "teach Relay to send Block Kit." The plumbing exists and `OutboundMessage.blocks` is already wired. B2 shrinks to two things: widen `FinalRender` (today `{target, text, outcome, conversationUrl}`) to carry optional blocks, and prefer them over the single markdown block.

**2. Per-thread serialization is already guaranteed.** The ingest queue is SQS FIFO with `MessageGroupId: tenantKey#threadKey` and `MessageDeduplicationId: idempotencyKey`. The inbound ordering constraint this doc previously flagged as a dependency is already satisfied. Drop it as a risk.

**3. Malformed Block Kit replaces the answer with a notice.** `renderFinalPost` catches `invalid_blocks` and re-posts a canned "payload rejected" message instead. A projection bug therefore does not degrade to *unstyled text* — it degrades to *no answer at all*. Validate blocks before they go on the wire, and keep a `text` that still carries the full answer.

One more detail matters for B3. Terminal idempotency is `finalClientMessageId(execution)`, derived per **execution** rather than per message. Per-message posting needs a per-message key, which is exactly the `message_key` proposed below.

### What the feature is

Treat **each Slack-bound assistant message** as one Adaptive UI `ViewSpec`. Markdown segments become `text({ format: 'markdown' })` nodes. Each resolvable `<render_attachment>` is replaced by that attachment's primitives, inlined into the parent `body` rather than wrapped as Slack JSON. Project with `renderSlack`, and Relay posts those blocks as a message in the thread.

One AB message becomes one Slack message. See [The unit is the message](#the-unit-is-the-message-not-the-round) for why the round is the wrong unit.

That is Adaptive UI's actual job: a portable view that renders anywhere. It is also the same composition the remark tree already performs in chat, expressed as a spec so a headless host can project it.

It is **not** any of these:

- A Slack Block Kit node inside the spec.
- Reverse-parsing Slack to recover views.
- Teaching Relay Adaptive UI.
- Requiring the agent to remember a tool call.

### Canonical document

Parse `round.response.message` the way the render-attachment plugin does, splitting on `<render_attachment id="…" version="…"/>`, and build:

```ts
view({
  body: [
    text({ format: 'markdown', body: leadingProse }),
    ...attachmentView.body, // inlined primitives
    text({ format: 'markdown', body: trailingProse }),
  ],
});
```

Both halves of that parse already exist, but in the browser. `renderAttachmentTagParser` and `resolveAttachmentVersion` are exported from [`render_attachment_plugin.tsx`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/markdown_plugins/render_attachment_plugin.tsx). Move the tag-name and attribute constants plus the version resolver to `common/`, so the server composer and the remark plugin share one definition. A second regex for the same tag is how the two paths drift.

Empty prose segments are dropped. Unresolvable tags degrade to a short sentence or code span, so Slack never shows a raw tag. Relay's "View in Kibana" context block stays **Relay chrome**, appended after `renderSlack`.

`renderSlack(composed, { collectAssets: true })` is the Slack projection. `renderMarkdown(composed)` is the notification and `text` fallback, and a plausible GitHub projector later — same composer, different `render*`.

### Where it runs — seam confirmed

The projector runs in **Kibana**, on the callback delivery path, gated on Slack origin. Relay stays "post these blocks."

Kibana is the only host that can resolve an attachment id and version to `attachment.data`. `@kbn/adaptive-ui-adapters` is already `shared-common` and pure. `renderSlack`, `parseViewSpec`, and `validateView` already run server-side in `post_view.ts`.

Two seam questions were checked against the source. The answer to the second is the best news in this doc: the projector needs no data it isn't already handed.

**1. Is `origin` reachable where callbacks are delivered?** Yes. `ConversationExecutionParams.origin` is `ExecutionConversationOrigin` ([`execution/types.ts:60-90`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-server/execution/types.ts)). So `execution.agentParams.origin?.type === ConversationOriginType.Slack` is readable inside [`deliverCallbackEvents`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/callback/deliver_callback_events.ts) with no plumbing. Callback converse always routes through Task Manager, so [`task_handler.ts:103`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/task/task_handler.ts) is the single call site.

**2. Can attachments be loaded there?** They don't need to be loaded — the event carries them. `RoundCompleteEventData.attachments?: VersionedAttachment[]` ([`events.ts:293-308`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/events.ts)) is *"updated conversation-level attachments after this round"*. It is populated from `attachmentStateManager.getAll()` at [`add_round_complete_event.ts:209`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/utils/add_round_complete_event.ts), and `reconcileAttachments` states the contract outright: *"Producers carry the whole list."*

That means no conversation client, no scoped request, no `task_handler.ts` change, and no dependency on when the conversation write lands. The projector is a pure function of `(execution, event)` called inside `deliverCallbackEvents`.

It also sidesteps a trap the obvious implementation walks straight into. Re-reading the conversation would couple the projector to persistence ordering across two independent `events$` subscribers. That fails *intermittently*, degrading every tag to fallback in precisely the case the feature exists for.

For the record, the ordering does hold. `persistenceEvents$` is inside the `merge` at [`execution_runner.ts:311`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/execution_runner.ts), so the merged stream cannot complete before the conversation write resolves. Relying on that is still strictly worse than not needing it.

⚠️ **Build a delivery-only copy of the event.** The event is captured off a multicast `events$` with a second subscriber (`collectAndWriteEvents`). Never mutate it in place — clone, then enrich.

### The unit is the message, not the round

An earlier draft of this doc projected only the terminal `round_complete`. That is wrong, and not just because it is slow. It is lossy:

```ts
// add_round_complete_event.ts:444, :509-514
const lastMessage = messages.length ? messages[messages.length - 1] : undefined;
…
response: lastMessage ? { message: lastMessage.message_content, … } : { message: '' }
```

A round's `response.message` is **the last `message_complete` only**, not a concatenation. A round that emits three assistant messages projects one, and the first two never reach Slack. Latency is a preference; dropping content is a bug.

The right unit is **`message_complete`** ([`events.ts:253-260`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/events.ts)), which carries `message_id` and the full `message_content` for that message. Each message projects independently, so Slack sees the agent's first substantive message as soon as it exists rather than after every tool call finishes. For a minute-long Nightshift investigation, that is the difference between a live thread and a dead one.

`message_complete` already reaches Relay today, unprojected. `deliverCallbackEvents` filters `message_chunk` and nothing else, and its test asserts exactly that: *"filters out message_chunk events and delivers the rest."* The wire already carries the right granularity. Only the projection is missing.

| Input | Source, per message |
| --- | --- |
| Prose + render tags | `event.data.message_content` |
| Stable key for post-vs-update | `event.data.message_id` |
| Attachment data to resolve tags against | **new** — tag-referenced subset |
| Version resolution | round `attachment_refs` (terminal) / explicit tag `version` |
| Whether to project at all | `execution.agentParams.origin?.type` |

**Attachments per message: bound the payload by tag, not by round.** `message_complete` has no attachments field today, so one must be added. Carrying `getAll()` on every message is how this becomes a payload-size incident: attachment `data` holds ViewSpecs and blobs, the event fires on every message, and the browser consumes it too.

Emit only the attachments whose ids appear in `<render_attachment>` tags in that `message_content`. The emit site already has `attachmentStateManager` in scope — same scope as the terminal event, narrower selector — and the subset is bounded by what the message actually renders. This preserves the property that makes the seam clean: the projector stays a pure function of the event.

**Terminal must then stop projecting.** The final `message_complete` and `round_complete.response.message` are the same string. Make the rule mechanical, because "don't double-post" gets implemented as a guess. If any `message_complete` was projected for this execution, `round_complete` projects nothing and carries finalization only (footer, final status). A naive implementation posts the last message twice, and the duplicate is the *answer* — the most visible possible failure.

⚠️ **Per-message deliveries are at-most-once today.** `deliverCallbackEvents` passes `retry: isTerminal`, and its test spells this out: *"retries only round_complete events; other events are delivered at-most-once."* A projected message whose delivery fails is silently lost. Extend the retry predicate to cover projected message events, and let the terminal event reconcile — it knows the round's full text and can detect that a projection never landed.

### Resolving attachments to specs

There are two families.

**1. `platform.adaptiveUi.view`.** `data` *is* the `ViewSpec`. The server can `parseViewSpec` today with no registry at all. This covers `render_view` and `request_registered_view`.

**2. Native types with a browser `getViewSpec`** (`platform.sig_event`, `nightshift.investigation`, `esql`, `case`, …). The mapping currently lives on `AttachmentUIDefinition` in the browser. The server attachment contract has `validate`, `format`, `resolve`, and `isStale`, but no spec hook. This family is what step A2 exists for.

The current server map ([`attachment_view_specs.ts:40`](../../x-pack/platform/plugins/shared/adaptive_ui/server/surface/attachment_view_specs.ts)) is hand-maintained: each `attachmentType → to*ViewSpec` entry is imported explicitly. `adapterGallery` in [`adaptive-ui-adapters/index.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/index.ts) is sample-spec *data*, not an adapter function map, so the server map cannot simply re-key it — the two are different shapes. Two paths forward:

- **Canonical registry (preferred).** Change `adaptive-ui-adapters` to export an explicit `attachmentType → (data) => ViewSpec` map alongside the existing `to*ViewSpec` functions. The server map imports from it, eliminating the hand-maintained duplicate.
- **Parity test (acceptable short-term).** Keep the hand-maintained map and add a test that asserts every type in `adapterGallery` has a corresponding entry in the server map, so drift fails CI rather than silently degrading a surface.

The PoC uses the hand-maintained map. A2 should resolve the path forward with `@elastic/workchat-eng` and `adaptive-ui-adapters` owners before the first real PR. It is reusable by every future surface, which is why it is ordered before the wire change.

Until A2 lands, a native-type tag degrades to a generic "not viewable here" stub ([`project_reply.ts:84`](../../x-pack/platform/plugins/shared/adaptive_ui/server/surface/project_reply.ts)). `format()` fallback is not wired: `SurfaceProjectionInput` carries no formatter, and the projector is not injected with the attachment type registry. Wiring `format()` is deferred to A2 or later; the PoC stub is acceptable for the first PR. Never fail the whole Slack post over one tag.

### Handing Relay the projection

Relay's `renderFinal` must stop wrapping the raw message when a projection is present.

The recommended contract is additive. It rides on any callback delivery that carries a projection: `message_complete` during the round, `round_complete` at the end.

```ts
{
  execution_id: string;
  idempotency_key?: string;       // terminal only, today
  event: ChatEvent;               // unchanged; content still carries tags for Kibana
  projection?: {
    slack?: {
      message_key: string;        // `message_id` — Relay's post-vs-update key
      text: string;               // notification + fallback; tags stripped
      blocks: unknown[];          // Adaptive UI Block Kit; Relay appends its footer
      final?: boolean;            // last projection for this turn; footer goes here
    };
  };
}
```

Relay prefers `projection.slack` when present, and otherwise keeps today's markdown wrap.

**`message_key` is the contract that makes per-message projection safe.** Relay keeps a `message_key → Slack ts` map per thread. The first delivery is `chat.postMessage`; any re-delivery of the same key is `chat.update`. Without it, per-message projection duplicates on retry, and today only the terminal delivery carries `idempotency_key`, so per-message deliveries have no dedup handle at all. This is a question for the Relay owners, not an assumption. If Relay cannot hold that map per thread, the unit has to fall back to fewer, coarser posts.

Two things to avoid. Do not replace `response.message` with Block Kit, because Kibana chat still needs the tagged markdown. Do not have Kibana call `RelayClient.trigger` for the same turn, because that double-posts against `renderFinal`.

### Charts and files

**Charts are implemented (C3 landed with B2).** `renderSlack` is called with `collectAssets: true`; each emitted asset is rasterized to PNG at 2× pixel density in Kibana and shipped as base64 on `projection.slack.assets`. Relay decodes each asset, uploads it via `filesUploadV2`, polls `files.info` until `mimetype` appears (the documented readiness signal), then rewrites the matching `slack_file.ref` to the file id before calling `toPostableBlocks`. An `image` block with a surviving `ref` (upload failed or timed out) causes the whole projection to fall back to markdown — a partial resolution would fail the Slack message.

Degradation is all-or-nothing at two budget checkpoints: Kibana refuses to ship more than 2 MB of chart bytes on the callback, and Relay enforces the same limit on decode. If either fires, the projector re-renders without `collectAssets` so charts degrade to their text form rather than leaving unresolved refs.

`files:write` and `files:read` are now in the default OAuth scopes. `files:read` is used to confirm upload readiness; if the scope is absent Relay waits a fixed interval instead of polling, which is safe but slower.

### What not to put on the callback

- Full attachment blobs on any event, including `message_complete`. The tag-referenced subset is the bound.
- Projections on `tool_call`, `tool_progress`, or `reasoning`. Assistant *messages* are the unit; tool chatter is not a Slack message. Relay can still surface progress as it does today.
- `<visualization>`, `<render>`, and `<dashboard>` until they have server adapters. Leave them inside the markdown `text` nodes.

### Later, not this feature

- **Interactive HITL** (`prompt_request` / `awaiting_prompt`). Block Kit buttons are the natural projection for a prompt request, and per-message projection is what makes it possible. It also carries its own failure modes — HITL state, Slack interactivity endpoints, Relay's `needs_input` path — so it is a separate feature. Relay keeps treating it as `needs_input` for now.

  Related: replies typed in the **Kibana AB UI** for a Slack-originated conversation do not return to Slack today. The reason is structural, not an oversight. `CallbackDeliveryService.getCallbackUrl` returns `execution.agentParams.callback?.url`, which is only present when the **caller** (Relay) supplies `callback.url` in the converse request. The Kibana UI calls the public `POST /api/agent_builder/converse` endpoint, which does not accept or forward a callback URL — `deliverCallbackEvents` exits immediately as a no-op for those turns. Each execution carries its own callback independently; there is no conversation-level callback URL that Relay could register once and reuse. Fixing this requires either storing the Relay callback URL on the conversation so Kibana-UI turns can inherit it, or a push path from Kibana back through Relay after each UI-initiated round.

- GitHub and MS Teams projectors: same composer, different `render*`, `projection.<surface>`.
- Slack `event.blocks` and files on converse `attachments`.

---

## Inbound: Slack → Agent Builder

Two independent problems, with different urgency and different owners. Neither needs a `ViewSpec`.

### (a) Prompt fidelity — what the model actually reads

Today the Slack message is flattened to a string in `RoundInput.message`. Slack mrkdwn arrives raw: `<@U0123>` with no name, `<https://…|label>`, `:emoji:`, `&amp;` entities, and quoted blocks. Files and images attached to the message are invisible to the agent entirely.

This degrades answer quality regardless of any rendering. The fix is Relay-side normalization plus an existing API: `ConverseInput.attachments` already accepts `{ type, data }` or `{ type, origin }` for by-reference types that implement `resolve`. The work is:

- **mrkdwn → markdown.** Resolve user and channel mentions to display names, unwrap `<url|label>` to `[label](url)`, decode entities, and keep code and quote blocks.
- **Thread context.** Relay decides how much prior thread history to include. AB conversation continuity already keys off `origin.external_conversation_id`.
- **Files.** Pass Slack file references as attachments rather than dropping them. This requires a named `slack.file` attachment type before implementation starts. Open questions that need answers before C1 ships: which team owns the type and its `resolve` implementation; how `origin`-based resolution fetches the file from Slack (the Slack bot token is on the Relay side, so resolution may need to stay there or be delegated); Slack download token lifetime relative to AB's round duration; and size and privacy constraints (private channel files, DM files, large uploads).

This is the cheapest real win in the whole plan, and it needs nothing from Kibana.

Message granularity applies inbound too, and the ordering constraint is already handled. Each Slack message is already its own ingestion unit: Slack event → converse callback, with continuity via `origin.external_conversation_id`. Relay submits each message as it arrives rather than blocking to assemble thread history, and AB supplies prior context from the conversation itself.

An earlier draft flagged a risk that two people posting during a running turn would open concurrent rounds on one conversation. That is verified as already solved. The ingest queue is SQS FIFO keyed `MessageGroupId: tenantKey#threadKey`, with `MessageDeduplicationId: idempotencyKey`. Vignesh's *"Relay queues it and submits the turn"* is that queue, and it serializes per thread by construction.

### (b) Transcript fidelity — what a Kibana user sees

[`RoundInput`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_input.tsx) renders `CommandBadgeText(input)` in a bubble and never looks at `origin` or `author`, even though both are persisted on the round. Opening a Slack-originated conversation in Kibana therefore loses who asked and where.

The work is pure Kibana UI, with no wire change: render `author.full_name` / `username` and an origin affordance on the bubble, treat the message as markdown, and show inbound file chips.

**The narrow Adaptive UI exception.** When the inbound message carries *structured* parts — Slack files, a quoted message, Block Kit posted by another app — the round input body can take a `ViewSpec`. That is exactly the conditional seam commit `c8e7ce8` established for native attachment types via `getViewSpec`. Plain text stays plain React. Do not lead with this.

---

## Where the projector lives — decided and built

`adaptive_ui` declares `agentBuilder` in `requiredPlugins`. The reverse is not true and must not become true. So the projector cannot live in the `adaptive_ui` plugin and be called from `deliverCallbackEvents` — that is the cycle the repo forbids. This is a cross-team API decision, and it is the one thing that had to be settled before a first PR.

It is resolved as option (c) and implemented. The branch carries a working bucket A so the choice can be reviewed as code rather than argued in the abstract. `@elastic/workchat-eng` still owns the call on the contract surface; the diff is the proposal, not a fait accompli.

The renderer and parser dependencies are not the problem. `@kbn/adaptive-ui` and `@kbn/adaptive-ui-adapters` are both `shared-common` / `visibility: shared`, so `agent_builder` server code may import `renderMarkdown`, `renderSlack`, `parseViewSpec`, and the `to*ViewSpec` adapters directly with no cycle. Only the *placement of the projector* was open.

| Option | Shape | Trade |
| --- | --- | --- |
| (a) Composer in `agent_builder` server | Import the shared packages at the delivery seam | Smallest diff; puts Adaptive UI and Slack concerns inside a `@elastic/workchat-eng` plugin |
| (b) New shared package | `@kbn/adaptive-ui-…-projection`, imported by `agent_builder` | No cycle, ownership stays put; one more package |
| **(c) Projector registry on the AB setup contract** | `adaptive_ui` registers a surface projector | Established precedent; needs a new contract surface |

Option (c) matches how `adaptive_ui` already plugs into `agent_builder` on four other surfaces — attachment types, tools, and `agentBuilder.renderers.register(…)`. `agent_builder` stays ignorant of Adaptive UI. It needs a new contract surface and `@elastic/workchat-eng` buy-in.

Hooks are not the answer today. `HookLifecycle` has only `beforeAgent`, `beforeToolCall`, and `afterToolCall`, with nothing at callback delivery. Using them would mean adding a lifecycle, which is a larger change than a small dedicated registry.

### What the PoC actually ships

| Piece | Location |
| --- | --- |
| `SurfaceProjectorDefinition` / `SurfaceProjection` contract | `agent-builder-server/surface_projection/` |
| `surfaceProjection.register` on the AB setup contract | `agent-builder-server/plugin_contract.ts` |
| Registry + service, mirroring the renderers service | `agent_builder/server/services/surface_projection/` |
| Origin gate, event clone, degrade-on-failure | `agent_builder/…/callback/project_round_for_surface.ts` |
| Invocation on the terminal delivery | `agent_builder/…/callback/deliver_callback_events.ts` |
| `attachmentType → ViewSpec` registry (A2) | `adaptive_ui/server/surface/attachment_view_specs.ts` |
| Tag substitution via `renderMarkdown` (A1) | `adaptive_ui/server/surface/project_reply.ts` |
| Slack projector + registration | `adaptive_ui/server/surface/slack_projector.ts` |

`agent_builder` gained no dependency on `adaptive_ui` and no knowledge of Adaptive UI. It holds a registry keyed by `ConversationOriginType` and calls whatever is registered. B1 has since added `renderSlack` alongside `renderMarkdown` in the projector, and the seam did not move — which is the evidence the registry was cut in the right place.

Root-relative `href`s are rewritten against the space-aware public Kibana origin before rendering. A bare `/app/…` link is dead once it leaves Kibana, which is why `SurfaceProjectionInput` carries `spaceId`.

**Known divergence.** The server matches render tags with its own regex rather than the remark plugin's parser. Sharing `renderAttachmentElement` bounds the drift, since tag and attribute names cannot diverge. The two still differ on edge cases, such as a tag inside a fenced code block: the remark plugin leaves it alone and this one substitutes. That is acceptable for a PoC, and a shared parser is the durable fix. `resolveAttachmentVersion` *is* now shared, in `@kbn/agent-builder-common/attachments`.

B2 and B1 have since landed on top of this seam; see [Built so far](#built-so-far). Per-message projection (B3) and charts remain unbuilt, so the terminal-only lossiness stands as documented.

## Plan, ordered by what Relay can already render

Relay is `elastic/relay-service`, a different repo on a different cadence. Order the work so each Kibana step delivers standalone value and nothing waits on a cross-repo release it does not need.

The dividing line is not Kibana-vs-Relay work. It is what Relay can already render. Today Relay posts `response.message` from `round_complete` as markdown, so anything that lands *inside that string* reaches Slack with no Relay change at all. Everything else is a Relay capability before it is a Kibana one: Block Kit, and one Slack message per assistant message. Per-message posting in particular *is* the `message_key → ts` map, and Kibana cannot produce N Slack messages from a Relay that emits one.

That splits the work into three honest buckets.

### Bucket A — Kibana alone, ships to Slack immediately

| # | Step | Touches |
| --- | --- | --- |
| A0 | Share tag constants and version resolution: move render-tag constants and `resolveAttachmentVersion` to `common/` | `agent_builder` common + public |
| A1 | Terminal tag → markdown substitution on Slack-origin delivery | `agent_builder` callback delivery |
| A2 | Server attachment → spec registry; canonical map or parity test vs. hand-maintained map | `adaptive-ui-adapters` + attachment owners |

A0 shares tag constants and `resolveAttachmentVersion` into `common/` so both the server projector and the client remark plugin import from one place. No user-visible change. Note: a second server-side regex remains in `project_reply.ts` until a shared parser replaces both; A0 does not eliminate that drift, it only prevents tag constants from diverging.

A1 is the standalone milestone. Clone the event, substitute resolvable tags in `response.message` with `renderMarkdown(spec)`, and strip unresolvable tags (degrading each to a generic stub). Raw tags stop reaching Slack, with zero Relay change. `format()` fallback is deferred to A2.

A2 makes native types render as real markdown instead of a fallback line, and is reusable by every future surface.

A1 is lossy by construction, since `response.message` is only the last message. It is also the only projection Relay renders without a bump, so it is the foundation rather than a detour. Bucket B upgrades it, and nothing in B discards it.

### Bucket B — lockstep with Relay

| # | Step | Touches |
| --- | --- | --- |
| B1 | Composer + Slack projection | `adaptive_ui` |
| B2 | `projection.slack` on the wire; widen `FinalRender` to carry blocks | both repos |
| B3 | Per-message granularity | both repos |

B1 is `message + attachments → ViewSpec`, then `absolutizeViewSpecHrefs` → `renderSlack` → asset degrade, reusing `post_view.ts` helpers minus the connector post. It is buildable and unit-testable ahead of Relay, and delivers nothing to Slack until B2.

B2 is smaller than it looks, because Relay already posts a `blocks` array. It is what gets Block Kit to Slack.

B3 is the lossiness fix: tag-bounded attachments on `MessageCompleteEventData`, a projection per `message_complete`, terminal suppression, a widened retry predicate, and Relay's `message_key → ts` post-vs-update map. It is inherently cross-repo.

B3 is a joint design checkpoint, not a Kibana-only build. Start implementation only after Relay owners confirm:

- Relay can hold a `message_key → Slack ts` map per thread for the lifetime of a round.
- A duplicate `message_key` delivery triggers `chat.update`, not a second `chat.postMessage`.
- Relay's `message_key → ts` map is idempotent on post/update: a duplicate `message_key` calls `chat.update`, not a second `chat.postMessage`. (This is the Relay-side contract.)
- AB's callback delivery marks non-terminal projected `message_complete` callbacks retryable. Today only the terminal delivery carries `idempotency_key`, so per-message projections have no dedup handle; AB needs to supply one. (This is the AB-side contract.)
- Relay's failure mode for a bad per-message block is a per-message replacement notice, not a dropped round.

Without this sign-off, Kibana can build a projection that Relay cannot safely post.

### Bucket C — independent of both

| # | Step | Owner | Status |
| --- | --- | --- | --- |
| C1 | Inbound mrkdwn normalize + file passthrough into `ConverseInput` | Relay | Normalize ✅; files deferred |
| C2 | Transcript renders `origin` / `author` / files on `RoundInput` | Kibana | ✅ (files deferred) |
| C3 | Charts on the Relay path | Relay | ✅ landed with B2 |

C3 forced `files:write` and `files:read` into the default OAuth scopes. Existing installs will need a re-authorization on the next deploy.

**What to say in the thread.** Bucket A shipped and makes Slack threads readable. B1 and B2 shipped together and are the actual answer to *"convert that to whatever Adaptive UI is doing before it gets back to Slack"* — Kibana composes the reply into a `ViewSpec` and projects it; Relay posts those blocks. The remaining outbound gap is B3, because posting one Slack message per assistant message is a Relay behavior change rather than a rendering change, and it needs the sign-off below before code.

That branch is now resolved. Relay posts nothing from non-terminal deliveries, since `renderProgress` only sets a thread status. B3 is confirmed cross-repo and stays where it is.

## Ownership and seams

| Piece | Owner |
| --- | --- |
| Composer + Slack projection | `adaptive_ui` |
| When to project + invoke the projector | `agent_builder` `deliver_callback_events.ts` |
| Tag-bounded attachments on `message_complete` | `agent_builder` runner (`add_round_complete_event.ts` emit site) |
| `projection.slack` on the wire + `message_key` semantics | AB + Relay |
| Server attachment → spec registry | `adaptive-ui-adapters` + attachment owners |
| mrkdwn normalization, thread context, file refs | Relay |
| Footer, status, idempotent post | Relay (unchanged) |

Notes on the less obvious rows:

- **Projection gate.** `execution.agentParams.origin?.type === slack`, never for Kibana-UI streams. It is a pure function of `(execution, event)` with no new deps. It also owns terminal suppression and the retry predicate.
- **Per-message attachments.** The emit site has `attachmentStateManager` in scope. Select by tag ids in `message_content`, never `getAll()`.
- **Wire change.** Additive, but it requires a Relay bump. Confirm parser behavior and whether Relay can hold a `message_key → ts` map.
- **Spec registry.** The server map is hand-maintained and held at parity with `adapterGallery` by a test; a canonical exported registry is still the durable fix.

## Risks

- **Relay's parser drops unknown fields** (verified). A `projection` field is ignored rather than rejected, so shipping it early is harmless but inert until Relay is bumped. That is why bucket A lands inside `response.message` instead, and why `projection.slack.text` must carry a tag-stripped fallback.
- **Malformed Block Kit costs the whole answer** (verified). Relay's `invalid_blocks` recovery replaces the message with a canned notice, so a bad projection is worse than no projection. Validate before the wire and keep the full answer in `text`.
- **Payload size — two distinct budgets.** Slack's per-message block budget means bounding composed body nodes; Adaptive UI already caps graphs and tables. On overflow, keep the first card, truncate trailing prose, and lean on the footer link. The *callback* payload is separate: attachments on `message_complete` must be the tag-referenced subset, or every message on the wire carries every blob in the conversation.
- **Double-posting the answer.** The final `message_complete` and `round_complete.response.message` are the same string. If terminal projection is not suppressed once any message was projected, the duplicated message is the answer itself.
- **Silently dropped messages.** Non-terminal callbacks are at-most-once today. Until the retry predicate covers projected messages, a failed delivery loses that message from Slack with no signal.
- **Double posting via the tool.** If the agent also calls `post_view_to_slack` on a Slack-origin turn, Slack gets two messages. Document it, and consider no-opping the tool when `origin.type === 'slack'`.
- **Event mutation.** Enriching the shared `round_complete` in place would corrupt what the persistence subscriber writes. Clone it.
- **Version skew.** For tag `version` versus latest attachment version, reuse `resolveAttachmentVersion`'s order: explicit, then round refs, then latest.
- **Chrome mismatch is expected.** Slack shows Adaptive UI Slack, not Kibana card chrome with headers and actions. That is correct, not a bug.

## Test plan

**Composer.** Prose only. One `platform.adaptiveUi.view`. Two tags with prose between them. Unknown id. Unknown type. Empty message. Tag at start and at end. `event.data.attachments` absent entirely, where every tag degrades and the post still succeeds.

**Delivery gate.** Slack origin projects. Kibana-UI converse and async executions do not. `awaiting_prompt` does not. The persisted round is byte-identical to the unprojected case.

**Message granularity.** A round emitting three `message_complete` events yields three projections in order, each with its own `message_key`, and the terminal event carries no projection. A single-message round still yields exactly one Slack message. A round with zero messages (prompt request only) yields none.

**Attachment subset.** A message with one tag carries one attachment. A message with no tags carries none. A tag whose id is absent degrades, and the post still succeeds.

**Projection golden.** The composed spec's Block Kit equals concatenating `renderSlack` of the parts in document order, or a fixture snapshot.

**Relay (`relay-service`).** `projection.slack.blocks` is posted verbatim, the footer is appended, and an absent projection preserves the markdown wrap.

**Inbound.** Mentions, links, and entities normalize. Slack files reach the agent as attachments. The transcript shows author and origin.

**Manual.** Mention the bot in a bound channel and ask for a registered view. Confirm Slack shows Block Kit plus prose, the Kibana transcript still shows the card, and no raw `<render_attachment>` appears anywhere.

## Success

A Slack-originated Agent Builder turn posts one Slack message per assistant message. Each message's Block Kit is `renderSlack` of that message's composed spec. Messages arrive as the agent produces them, not all at the end, and Relay's Kibana link sits in the footer of the last one.

Projection is triggered by `origin`, with no tool call and no button. Nothing is duplicated and nothing is dropped.

The same conversation opened in Kibana shows who asked, from where, and the same views as cards.
