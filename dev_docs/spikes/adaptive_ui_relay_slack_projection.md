# The whole Slack message, both ways: Relay ⇄ Agent Builder

**Status:** bucket A implemented (PoC) · **Surfaces:** Agent Builder callback converse, Adaptive UI, Relay (`elastic/relay-service`) · **Not in the portable-chat demo requirements** — this is the follow-up the Relay/AB round-trip critique is actually asking for.

The demo shipped on this branch (AB → Slack via `post_view_to_slack` and the attachment share menu) is a *user action*: a person clicks **Send to Slack**. The critique is right that this does nothing for the Slack thread itself. Vignesh: *"Rendering has to be a native component of the AB conversation model. It won't happen based on a user action per turn. AB has to understand the origin of the conversation … and model the output in such a way that its rendering is automagic."* Pierre, on the same path: *"(1) Slack → (2) Relay → (3) AB HTTP converse API → (4) Relay → (5) Slack … no UI … we need to convert that to whatever that adaptive UI thing is doing before it gets back to Slack (5)."*

Both are describing the same missing piece at **(4)**: a projector, triggered by `origin`, that turns the agent's *entire* reply into a Slack message. This doc plans that, plus the inbound half — and argues the two halves are **not** the same kind of problem.

> **On the Relay side of this doc:** every claim about `relay-service` (the callback parser keeping only `response.message`, `renderFinal`'s markdown wrap, no `files:write` on the Slack app, inbound mrkdwn arriving unnormalized) comes from reading that repo around the demo, not from this worktree. Those are the items to confirm with Bruno/Pierre — the Kibana-side seams below are verified against source and cited inline.

## The two directions are different problems

| | Inbound — Slack → AB | Outbound — AB → Slack |
| --- | --- | --- |
| Problem | **Ingestion / normalization** | **Projection / rendering** |
| Pivot | The round model AB already has (`ConversationRoundOrigin`, `ConversationRoundAuthor`, `attachment_refs`) | `ViewSpec` |
| Adaptive UI role | Mostly none — text, author chrome, and file chips are Kibana React | Central — the reply *becomes* a `ViewSpec`, then `renderSlack` |
| Primary owner | Relay (prompt) + Kibana UI (transcript) | Kibana (compose + project) + Relay (post) |

Vignesh's *"we have the conversation data model already done in AB via `origin` — so it exists"* is precisely why inbound does not need a new abstraction. `ConversationRound.origin` and `ConversationRound.author` are already persisted ([`conversation.ts:419-422`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/conversation.ts)), and `callbackConversePayloadSchema` already accepts `origin.type` / `origin.external_conversation_id` / `origin.author` ([`chat.ts:340-378`](../../x-pack/platform/plugins/shared/agent_builder/server/routes/chat.ts)). Nothing reads them.

Resisting symmetry is the point: a text bubble with an avatar and file chips is React chrome, and wrapping it in a spec buys nothing. The one narrow exception is recorded under [Inbound](#inbound-slack--agent-builder) below.

---

## Outbound: the entire reply, one Slack message per assistant message

### Problem

Relay submits a turn with `POST /internal/agent_builder/converse/callback` and later receives Agent Builder chat events on `POST {relay}/v1/events`. The terminal `round_complete` event carries `round.response.message`, a markdown string. A typical Adaptive UI reply looks like:

```text
Sure, here is the investigation.

<render_attachment id="a1b2c3" version="1" />
```

In Kibana chat, [`ChatMessageText`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/chat_message_text.tsx) plus [`render_attachment_plugin.tsx`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/markdown_plugins/render_attachment_plugin.tsx) parse those tags and mount Adaptive UI (or native chrome) inline. That UI does not exist on the Relay path.

Relay's Slack renderer takes `response.message` as a string and posts it as a Slack `markdown` block plus a "View in Kibana" footer. Slack therefore shows the tag literally, and the view never arrives.

The ask is not "post the attachment somehow." It is: **prose + every inline render** must become a Slack message before step (5), using the same projection the demo already uses for a single view.

```text
(1) Slack  →  (2) Relay  →  (3) AB converse/callback  →  (4) Relay  →  (5) Slack
                                                      ▲
                                                      no browser; tags stay tags
```

### What exists today

Three outbound Slack paths, none of which is this projector.

| Path | Who posts | What gets posted | Gap vs Relay |
| --- | --- | --- | --- |
| Kibana chat UI | n/a (on-screen) | Markdown AST + mounted `ViewSpec`s | Browser-only. |
| `post_view_to_slack` / share menu | Kibana via `.slack2` `sendMessage` | `renderSlack(one ViewSpec)` | Opt-in tool or button; one spec; connector, not Relay; a second post, not a replacement for Relay's final message. |
| Relay `renderFinal` | Relay via Slack Web API | `response.message` as `markdown` | No tag parse, no `ViewSpec`, no Block Kit. |

The Kibana connector path already has the whole pipeline in [`post_view.ts`](../../x-pack/platform/plugins/shared/adaptive_ui/server/slack/post_view.ts): `absolutizeViewSpecHrefs` → `renderSlack(spec, { collectAssets: true })` → rasterize charts → `uploadFile` → `sendMessage`. It is simply not wired to converse/callback. `RelayClient.trigger` already forwards `blocks` on `POST /v1/trigger`, but that is the proactive/connector direction, not the reactive reply.

Relay's callback parser (`parseConverseCallbackNotification` in `elastic/relay-service`) keeps only `response.message` from `round_complete`.

### What the feature is

Treat **each Slack-bound assistant message** as one Adaptive UI `ViewSpec`: markdown segments become `text({ format: 'markdown' })` nodes; each resolvable `<render_attachment>` is replaced by that attachment's primitives, inlined into the parent `body` (not wrapped as Slack JSON). Project with `renderSlack`; Relay posts those blocks as a message in the thread. One AB message, one Slack message — see [The unit is the message](#the-unit-is-the-message-not-the-round) for why the round is the wrong unit.

That is Adaptive UI's actual job — a portable view that renders anywhere — and it is the same composition the remark tree already performs in chat, expressed as a spec so a headless host can project it.

It is **not**: a Slack Block Kit node inside the spec; reverse-parsing Slack to recover views; teaching Relay Adaptive UI; or requiring the agent to remember a tool call.

### Canonical document

Parse `round.response.message` the way the render-attachment plugin does — split on `<render_attachment id="…" version="…"/>` — and build:

Both halves of that parse already exist, but in the browser: `renderAttachmentTagParser` and `resolveAttachmentVersion` are exported from [`render_attachment_plugin.tsx`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_response/markdown_plugins/render_attachment_plugin.tsx). Move the tag-name/attribute constants and the version resolver to `common/` so the server composer and the remark plugin share one definition — a second regex for the same tag is how the two paths drift.

```ts
view({
  body: [
    text({ format: 'markdown', body: leadingProse }),
    ...attachmentView.body, // inlined primitives
    text({ format: 'markdown', body: trailingProse }),
  ],
});
```

Empty prose segments are dropped. Unresolvable tags degrade to a short sentence or code span so Slack never shows a raw tag. Relay's "View in Kibana" context block stays **Relay chrome**, appended after `renderSlack`.

`renderSlack(composed, { collectAssets: true })` is the Slack projection; `renderMarkdown(composed)` is the notification/`text` fallback (and a plausible GitHub projector later — same composer, different `render*`).

### Where it runs — seam confirmed

**Kibana**, on the callback delivery path, gated on Slack origin. Relay stays "post these blocks." Only Kibana can resolve an attachment id + version to `attachment.data`; `@kbn/adaptive-ui-adapters` is already `shared-common` and pure; `renderSlack` / `parseViewSpec` / `validateView` already run server-side in `post_view.ts`.

Two seam questions, both checked against the source. **The answer to the second one is the best news in this doc: the projector needs no data it isn't already handed.**

1. **Is `origin` reachable where callbacks are delivered?** Yes. `ConversationExecutionParams.origin` is `ExecutionConversationOrigin` ([`execution/types.ts:60-90`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-server/execution/types.ts)), so `execution.agentParams.origin?.type === ConversationOriginType.Slack` is readable inside [`deliverCallbackEvents`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/callback/deliver_callback_events.ts) with no plumbing. Callback converse always routes through Task Manager, so [`task_handler.ts:103`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/task/task_handler.ts) is the single call site.

2. **Can attachments be loaded there?** **They don't need to be loaded** — the event carries them. `RoundCompleteEventData.attachments?: VersionedAttachment[]` ([`events.ts:293-308`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/events.ts)) is *"updated conversation-level attachments after this round"*, populated from `attachmentStateManager.getAll()` at [`add_round_complete_event.ts:209`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/utils/add_round_complete_event.ts), and `reconcileAttachments` states the contract outright: *"Producers carry the whole list."*

That means **no conversation client, no scoped request, no `task_handler.ts` change, and no dependency on when the conversation write lands.** The projector is a pure function of `(execution, event)` called inside `deliverCallbackEvents`. It also sidesteps a trap the obvious implementation walks straight into: re-reading the conversation would couple the projector to persistence ordering across two independent `events$` subscribers and fail *intermittently*, degrading every tag to fallback in precisely the case the feature exists for.

(For the record the ordering does hold — `persistenceEvents$` is inside the `merge` at [`execution_runner.ts:311`](../../x-pack/platform/plugins/shared/agent_builder/server/services/execution/execution_runner.ts), so the merged stream cannot complete before the conversation write resolves. Relying on that is still strictly worse than not needing it.)

⚠️ **Build a delivery-only copy of the event.** The event is captured off a multicast `events$` with a second subscriber (`collectAndWriteEvents`). Never mutate it in place — clone, then enrich.

### The unit is the message, not the round

An earlier draft of this doc projected only the terminal `round_complete`. **That is wrong, and not just because it is slow.** It is lossy:

```ts
// add_round_complete_event.ts:444, :509-514
const lastMessage = messages.length ? messages[messages.length - 1] : undefined;
…
response: lastMessage ? { message: lastMessage.message_content, … } : { message: '' }
```

A round's `response.message` is **the last `message_complete` only** — not a concatenation. So a round that emits three assistant messages projects one, and the first two never reach Slack at all. Latency is a preference; dropping content is a bug.

The right unit is therefore **`message_complete`** ([`events.ts:253-260`](../../x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/events.ts)), which carries `message_id` and the full `message_content` for that message. Each projects independently, so Slack sees the agent's first substantive message as soon as it exists rather than after every tool call finishes — for a minute-long Nightshift investigation, the difference between a live thread and a dead one.

**`message_complete` already reaches Relay today, unprojected.** `deliverCallbackEvents` filters `message_chunk` and nothing else; its test asserts exactly that (*"filters out message_chunk events and delivers the rest"*). So the wire already carries the right granularity — only the projection is missing.

| Input | Source, per message |
| --- | --- |
| Prose + render tags | `event.data.message_content` |
| Stable key for post-vs-update | `event.data.message_id` |
| Attachment data to resolve tags against | **new** — tag-referenced subset (below) |
| Version resolution | round `attachment_refs` (terminal) / explicit tag `version` |
| Whether to project at all | `execution.agentParams.origin?.type` |

**Attachments per message: bound the payload by tag, not by round.** `message_complete` has no attachments field today. Add one — but carrying `getAll()` on every message is how this becomes a payload-size incident: attachment `data` holds ViewSpecs and blobs, this event fires on every message, and the browser consumes it too. Emit **only the attachments whose ids appear in `<render_attachment>` tags in that `message_content`**. The emit site already has `attachmentStateManager` in scope — same scope as the terminal event, narrower selector — and the subset is bounded by what the message actually renders. This preserves the property that makes the seam clean: the projector stays a pure function of the event.

**Terminal must then stop projecting.** The final `message_complete` and `round_complete.response.message` are the *same string*. Make the rule mechanical, because "don't double-post" gets implemented as a guess: **if any `message_complete` was projected for this execution, `round_complete` projects nothing** and carries finalization only (footer, final status). A naive implementation posts the last message twice, and the duplicate is the *answer* — the most visible possible failure.

⚠️ **Per-message deliveries are at-most-once today.** `deliverCallbackEvents` passes `retry: isTerminal`, and its test spells this out: *"retries only round_complete events; other events are delivered at-most-once."* A projected message whose delivery fails is silently lost. Extend the retry predicate to cover projected message events, and let the terminal event reconcile — it knows the round's full text and can detect that a projection never landed.

### Resolving attachments to specs

Two families:

1. **`platform.adaptiveUi.view`** — `data` *is* the `ViewSpec`; the server can `parseViewSpec` today, with no registry at all. Covers `render_view` and `request_registered_view`.
2. **Native types with a browser `getViewSpec`** (`platform.sig_event`, `nightshift.investigation`, `esql`, `case`, …) — the mapping currently lives on `AttachmentUIDefinition` in the browser; the server attachment contract has `validate` / `format` / `resolve` / `isStale` and no spec hook. This family is what step A2 exists for.

**That registry is cheaper than the share-menu spike assumed.** `adapterGallery` in [`adaptive-ui-adapters/index.ts`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/index.ts) is already a list keyed by `attachmentType`, in a pure `shared-common` package, pairing every native type with its `to*ViewSpec`. A server registry is that same list re-keyed as `attachmentType → (data) => ViewSpec` — no second remap, no duplicated logic, importable from a server module. It is reusable by every future surface, which is why it is ordered before the wire change.

Until it lands, a native-type tag degrades (the type's `format()` if it has one, else an "open in Kibana" line). Never fail the whole Slack post over one tag.

### Handing Relay the projection

Relay's `renderFinal` must stop wrapping the raw message when a projection is present.

**Recommended contract** — additive, on any callback delivery that carries a projection (`message_complete` during the round, `round_complete` at the end):

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

Relay: prefer `projection.slack` when present; otherwise keep today's markdown wrap.

**`message_key` is the contract that makes per-message projection safe.** Relay keeps a `message_key → Slack ts` map per thread: first delivery is `chat.postMessage`, any re-delivery of the same key is `chat.update`. Without it, per-message projection duplicates on retry — and today only the terminal delivery carries `idempotency_key`, so per-message deliveries have no dedup handle at all. **This is a question for the Relay owners, not an assumption:** if Relay cannot hold that map per thread, the unit has to fall back to fewer, coarser posts.

Do **not** replace `response.message` with Block Kit — Kibana chat still needs the tagged markdown. Do **not** have Kibana call `RelayClient.trigger` for the same turn; that double-posts against `renderFinal`.

### Charts and files

`collectAssets: true` emits image placeholders needing a PNG upload. The Elastic Slack app on the Relay path historically has no `files:write`. Initially: if assets cannot be uploaded, re-render without `collectAssets` — the same degrade `post_view.ts` already implements. Step C3 adds upload on the Relay app, after which `slack_file` ids can be filled before posting. Do not block prose + cards on charts.

### What not to put on the callback

- Full attachment blobs on any event — including `message_complete`. The tag-referenced subset is the bound.
- Projections on `tool_call` / `tool_progress` / `reasoning`. Assistant *messages* are the unit; tool chatter is not a Slack message. Relay can still surface progress as it does today.
- `<visualization>` / `<render>` / `<dashboard>` until they have server adapters; leave them inside the markdown `text` nodes.

### Later, not this feature

- **Interactive HITL** (`prompt_request` / `awaiting_prompt`). Block Kit buttons are the natural projection for a prompt request, and per-message projection is what makes it possible — but it carries its own failure modes (HITL state, Slack interactivity endpoints, Relay's `needs_input` path) and is a separate feature. Relay keeps treating it as `needs_input` for now.
- GitHub / MS Teams projectors: same composer, different `render*`, `projection.<surface>`.
- Slack `event.blocks` and files on converse `attachments`.

---

## Inbound: Slack → Agent Builder

Two independent problems, different urgency, different owners. Neither needs a `ViewSpec`.

### (a) Prompt fidelity — what the model actually reads

Today the Slack message is flattened to a string in `RoundInput.message`. Slack mrkdwn arrives raw: `<@U0123>` with no name, `<https://…|label>`, `:emoji:`, `&amp;` entities, quoted blocks. Files and images attached to the message are invisible to the agent entirely.

This degrades answer quality regardless of any rendering, and it is **Relay-side normalization plus an existing API**: `ConverseInput.attachments` already accepts `{ type, data }` or `{ type, origin }` for by-reference types that implement `resolve`. Work:

- mrkdwn → markdown: resolve user/channel mentions to display names, unwrap `<url|label>` to `[label](url)`, decode entities, keep code and quote blocks.
- Thread context: Relay decides how much prior thread history to include; AB conversation continuity already keys off `origin.external_conversation_id`.
- Files: pass Slack file references as attachments rather than dropping them.

Cheapest real win in the whole plan, and it needs nothing from Kibana.

**Message granularity applies inbound too, with one constraint.** Each Slack message is already its own ingestion unit — Slack event → converse callback, with continuity via `origin.external_conversation_id` — so Relay should submit each message as it arrives rather than blocking to assemble thread history; AB supplies prior context from the conversation itself. The constraint: **per-message inbound depends on Relay serializing per `external_conversation_id`.** Two people posting in a thread while a turn is running would otherwise open concurrent rounds on one conversation. Vignesh's *"Relay queues it and submits the turn"* is exactly that queue — this plan assumes it, so it is worth stating rather than leaving implicit.

### (b) Transcript fidelity — what a Kibana user sees

[`RoundInput`](../../x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_input.tsx) renders `CommandBadgeText(input)` in a bubble and never looks at `origin` or `author`, even though both are persisted on the round. Opening a Slack-originated conversation in Kibana therefore loses who asked and where. Work: render `author.full_name` / `username` and an origin affordance on the bubble; treat the message as markdown; show inbound file chips. Pure Kibana UI, no wire change.

**The narrow Adaptive UI exception:** when the inbound message carries *structured* parts — Slack files, a quoted message, Block Kit posted by another app — the round input body can take a `ViewSpec`, exactly the conditional seam commit `c8e7ce8` established for native attachment types via `getViewSpec`. Plain text stays plain React. Do not lead with this.

---

## Where the projector lives — decided and built

**`adaptive_ui` declares `agentBuilder` in `requiredPlugins`; the reverse is not true and must not become true.** So the projector cannot live in the `adaptive_ui` plugin and be called from `deliverCallbackEvents` — that is the cycle the repo forbids. This is a cross-team API decision, and it is the one thing that had to be settled before a first PR.

**Resolved as option (c), and implemented** — the branch carries a working bucket A so the choice can be reviewed as code rather than argued in the abstract. `@elastic/workchat-eng` still owns the call on the contract surface; the diff is the proposal, not a fait accompli.

The renderer and parser dependencies are *not* the problem: `@kbn/adaptive-ui` and `@kbn/adaptive-ui-adapters` are both `shared-common` / `visibility: shared`, so `agent_builder` server code may import `renderMarkdown`, `renderSlack`, `parseViewSpec` and the `to*ViewSpec` adapters directly with no cycle. Only the *placement of the projector* is open.

| Option | Shape | Trade |
| --- | --- | --- |
| **(a) Composer in `agent_builder` server** | Import the shared packages directly at the delivery seam | Smallest diff; puts Adaptive UI and Slack-projection concerns inside a plugin owned by `@elastic/workchat-eng` |
| **(b) New shared package** | `@kbn/adaptive-ui-…-projection`, imported by `agent_builder` | No cycle, ownership stays with `@elastic/appex-sharedux`; one more package |
| **(c) Projector registry on the AB setup contract** *(recommended)* | `adaptive_ui` registers a surface projector the way it already registers attachment types, tools, and `agentBuilder.renderers.register(…)` | Exactly the established precedent between these two plugins; `agent_builder` stays ignorant of Adaptive UI; needs a new contract surface and `@elastic/workchat-eng` buy-in |

Hooks are not the answer today: `HookLifecycle` has only `beforeAgent` / `beforeToolCall` / `afterToolCall` — nothing at callback delivery — so using them would mean adding a lifecycle, a larger change than a small dedicated registry.

**Chose (c).** It matches how `adaptive_ui` already plugs into `agent_builder` on four other surfaces, and keeps the ownership boundary where it belongs.

### What the PoC actually ships

| Piece | Location |
| --- | --- |
| `SurfaceProjectorDefinition` / `SurfaceProjection` contract | `agent-builder-server/surface_projection/` |
| `surfaceProjection.register` on the AB setup contract | `agent-builder-server/plugin_contract.ts` |
| Registry + service, mirroring the renderers service | `agent_builder/server/services/surface_projection/` |
| Origin gate, event clone, degrade-on-failure | `agent_builder/server/services/execution/callback/project_round_for_surface.ts` |
| Invocation on the terminal delivery | `agent_builder/…/callback/deliver_callback_events.ts` |
| `attachmentType → ViewSpec` registry (A2), re-keying `adapterGallery` | `adaptive_ui/server/surface/attachment_view_specs.ts` |
| Tag substitution via `renderMarkdown` (A1) | `adaptive_ui/server/surface/project_reply.ts` |
| Slack projector + registration | `adaptive_ui/server/surface/slack_projector.ts` |

`agent_builder` gained no dependency on `adaptive_ui` and no knowledge of Adaptive UI: it holds a registry keyed by `ConversationOriginType` and calls whatever is registered. Swapping `renderMarkdown` for `renderSlack` in the projector is what bucket B's B1 becomes — the seam does not move.

Deliberately not built: per-message projection (B3, cross-repo), Block Kit on the wire (B2), and charts. The terminal-only lossiness stands as documented.

## Plan, ordered by what Relay can already render

Relay is `elastic/relay-service` — a different repo on a different cadence. Order so each Kibana step delivers standalone value and nothing waits on a cross-repo release it does not need.

**The dividing line is not Kibana-vs-Relay work — it is what Relay can already render.** Today Relay posts `response.message` from `round_complete` as markdown. Anything that lands *inside that string* reaches Slack with no Relay change at all. Everything else — Block Kit, and one Slack message per assistant message — is a Relay capability before it is a Kibana one. Per-message posting in particular *is* the `message_key → ts` map; Kibana cannot produce N Slack messages from a Relay that emits one.

That splits the work into three honest buckets.

### Bucket A — Kibana alone, ships to Slack immediately

| # | Step | Touches | Value |
| --- | --- | --- | --- |
| A0 | **Share the tag parse** — move the render-tag constants and `resolveAttachmentVersion` from `render_attachment_plugin.tsx` to `common/`. | `agent_builder` common + public | *Prerequisite* — no user-visible change. **Unblocked: the only step executable today**, and it stands on its own as a refactor even if the plan changes |
| A1 | **Terminal tag → markdown substitution** on Slack-origin delivery. Clone the event; substitute resolvable tags in `response.message` with `renderMarkdown(spec)` / `format()`; strip leftovers. | `agent_builder` callback delivery | **The standalone milestone.** Raw tags stop reaching Slack, ~a day, zero Relay change |
| A2 | **Server attachment → spec registry** — re-key `adapterGallery` as `attachmentType → (data) => ViewSpec`; `parseViewSpec` for `platform.adaptiveUi.view`. | `adaptive-ui-adapters` | Native types render as real markdown instead of a fallback line; reusable by every future surface |

A1 is lossy by construction — `response.message` is only the last message — but it is the **only** projection Relay renders without a bump, so it is the foundation, not a detour. Bucket B upgrades it; nothing in B discards it.

### Bucket B — lockstep with Relay

| # | Step | Touches | Note |
| --- | --- | --- | --- |
| B1 | **Composer + Slack projection** — `message + attachments → ViewSpec`, then `absolutizeViewSpecHrefs` → `renderSlack` → asset degrade, reusing `post_view.ts` helpers minus the connector post. | `adaptive_ui` | Buildable and unit-testable ahead of Relay; delivers nothing to Slack until B2 |
| B2 | **`projection.slack` on the wire**, Relay preferring it in `renderFinal`. | both repos | Block Kit reaches Slack |
| B3 | **Per-message granularity** — tag-bounded attachments on `MessageCompleteEventData`; project each `message_complete`; terminal suppression; widened retry predicate; Relay's `message_key → ts` post-vs-update map. | both repos | **The lossiness fix.** Inherently cross-repo — see the framing above |

### Bucket C — independent of both

| # | Step | Owner |
| --- | --- | --- |
| C1 | **Inbound mrkdwn normalize + file passthrough** into `ConverseInput` | Relay |
| C2 | **Transcript renders `origin` / `author` / files** on `RoundInput` | Kibana |
| C3 | Charts on the Relay path (`files:write` + upload) | Relay |

**What to say in the thread:** bucket A is committable now and makes Slack threads readable this week. Bucket B is the actual answer to *"convert that to whatever Adaptive UI is doing before it gets back to Slack"*, and it needs a Relay release — B3 especially, because posting one Slack message per assistant message is a Relay behavior change, not a rendering change.

**One branch to confirm first (it moves B3):** if Relay already posts or updates anything from non-terminal callback deliveries, then the per-message work is much closer to Kibana-only and B3 moves up. This doc assumes it does not, based on the parser reading flagged at the top. **Ask before scheduling B3.**

## Ownership and seams

| Piece | Owner | Notes |
| --- | --- | --- |
| Composer + Slack projection | `adaptive_ui` | Reuse `renderSlack` / `absolutizeViewSpecHrefs` / asset degrade. |
| When to project + invoke the projector | `agent_builder` `deliver_callback_events.ts` | `execution.agentParams.origin?.type === slack`; never for Kibana-UI streams. Pure function of `(execution, event)` — no new deps. Also owns terminal suppression and the retry predicate. |
| Tag-bounded attachments on `message_complete` | `agent_builder` runner (`add_round_complete_event.ts` emit site) | Has `attachmentStateManager` in scope; select by tag ids in `message_content`, never `getAll()`. |
| `projection.slack` on the wire + `message_key` semantics | AB + Relay | Additive but requires a Relay bump — **confirm parser behavior and whether Relay can hold a `message_key → ts` map**; see risks. |
| Server attachment → spec registry | `adaptive-ui-adapters` + attachment owners | Re-key `adapterGallery`; do not duplicate browser remaps. |
| mrkdwn normalization, thread context, file refs | Relay | Inbound only. |
| Footer, status, idempotent post | Relay | Unchanged. |

## Risks

- **Relay's parser may drop unknown fields.** It read as allowlist-ish on `message`; **confirm before bucket B is scheduled.** If it is strict, the projection is inert until Relay is bumped — which is exactly why bucket A lands inside `response.message` instead, and why `projection.slack.text` carries a tag-stripped fallback even when blocks are ignored.
- **Payload size.** Two distinct budgets. Slack's per-message block budget: bound composed body nodes (Adaptive UI already caps graphs and tables); on overflow keep the first card, truncate trailing prose, lean on the footer link. And the *callback* payload: attachments on `message_complete` must be the tag-referenced subset, or every message on the wire carries every blob in the conversation.
- **Double-posting the answer.** The final `message_complete` and `round_complete.response.message` are the same string. If terminal projection is not suppressed once any message was projected, the duplicated message is the answer itself.
- **Silently dropped messages.** Non-terminal callbacks are at-most-once today. Until the retry predicate covers projected messages, a failed delivery loses that message from Slack with no signal.
- **Double posting.** If the agent also calls `post_view_to_slack` on a Slack-origin turn, Slack gets two messages. Document it, and consider no-opping the tool when `origin.type === 'slack'`.
- **Event mutation.** Enriching the shared `round_complete` in place would corrupt what the persistence subscriber writes. Clone.
- **Version skew.** Tag `version` vs latest attachment version: reuse `resolveAttachmentVersion`'s order (explicit → round refs → latest).
- **Chrome mismatch is expected.** Slack shows Adaptive UI Slack, not Kibana card chrome (headers, actions). That is correct, not a bug.

## Test plan

- **Composer:** prose only; one `platform.adaptiveUi.view`; two tags with prose between; unknown id; unknown type; empty message; tag at start and at end; `event.data.attachments` absent entirely (every tag degrades, post still succeeds).
- **Delivery gate:** Slack origin projects; Kibana-UI converse and async executions do not; `awaiting_prompt` does not; the persisted round is byte-identical to the unprojected case.
- **Message granularity:** a round emitting three `message_complete` events yields three projections in order; each carries its own `message_key`; the terminal event carries no projection. A single-message round still yields exactly one Slack message. A round with zero messages (prompt request only) yields none.
- **Attachment subset:** a message with one tag carries one attachment; a message with no tags carries none; a tag whose id is absent degrades and the post still succeeds.
- **Projection golden:** composed spec's Block Kit equals concatenating `renderSlack` of the parts in document order (or a fixture snapshot).
- **Relay (`relay-service`):** `projection.slack.blocks` posted verbatim; footer appended; absent projection preserves the markdown wrap.
- **Inbound:** mentions/links/entities normalize; Slack files reach the agent as attachments; transcript shows author and origin.
- **Manual:** mention the bot in a bound channel, ask for a registered view, confirm Slack shows Block Kit + prose, the Kibana transcript still shows the card, and no raw `<render_attachment>` appears anywhere.

## Success

A Slack-originated Agent Builder turn posts **one Slack message per assistant message**, each one's Block Kit being `renderSlack` of that message's composed spec, arriving as the agent produces it rather than all at the end, with Relay's Kibana link in the footer of the last — triggered by `origin`, with no tool call and no button, nothing duplicated and nothing dropped — and the same conversation opened in Kibana shows who asked, from where, and the same views as cards.
