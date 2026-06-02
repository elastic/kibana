# B5 — Multi-user chat design (Option B POC)

**Status:** Draft — for review with Agent Builder platform (#259692)  
**Branch:** `option-b-poc`  
**Related:** [implementation plan](./agent_builder_option_b_implementation_plan.md) · [#259692 integration](./agent_builder_option_b_259692_integration.md) · [architecture](./agent_builder_investigation_cases_proposal.md)

**Audience:** Option B POC implementers + @pgayvallet (timeline execution owner)

---

## 1. Problem

After **B0**, `option-b-poc` has:

| Layer | State |
|-------|--------|
| Execution | Timeline-native ([#259692](https://github.com/elastic/kibana/pull/259692)): `UserMessageEvent.user`, `prepare_conversation`, agent modes |
| Persistence | **`conversation_rounds` only** — reload loses per-user message identity |
| ACL | **Owner-only** (`user_id` / `user_name`) |
| Converse | Every message **runs the agent** (no group append / `@agent` gate) |

**SOC pair goal:** two analysts share one investigation; human messages persist with author; agent runs only on `@agent`.

---

## 2. What #259692 removed (do not restore verbatim)

Commits on Pierre’s branch (reference only):

| Commit | Removed |
|--------|---------|
| `dd578db4` | `AgentTriggerHook` (`@agent`), `ConversationMode` on types, `execution_state` |
| `7df805f` | ES nested **`events[]`**, **`conversation_mode`**, dual-write converters, space-wide group list/ACL |

### Why not cherry-pick

| Removed approach | Gap for Option B |
|------------------|-------------------|
| Dual-write `events` + `conversation_rounds` | Read path rebuilds **rounds**; `UserMessageEvent.user` not in nested ES schema → **all messages look like conversation owner** after reload |
| `conversation_mode: group` ⇒ **any space user** | Too open for Security investigations |
| No per-record ACL on AB conv | Option B uses **space + template privileges** (Cases-aligned) — [access model](./agent_builder_option_b_access_model.md) |
| Hooks deleted separately | Restoring persistence alone doesn’t deliver group converse |

**Reuse the ideas** (persist `TimelineEvent[]`, mode, `@agent`). **Reimplement** on a cleaner contract below — including **`user` on persisted `user_message` events** (gap in removed nested schema).

---

## 3. Design principles

1. **`events` is canonical everywhere** for group conversations — ES, API, and execution (`TimelineConversation.events`). Not a derived projection from `rounds[]`.
2. **`UserMessageEvent.user` must round-trip** through ES (required for SOC pair Activity).
3. **Space + template access**, not per-conversation `members[]` — see [access model](./agent_builder_option_b_access_model.md).
4. **Split “append human message” from “invoke agent”** — same event stream, different API/trigger paths.
5. **Backward compatible:** single-user / legacy docs keep working via `conversation_rounds` + existing converse until migrated.
6. **One event model** — `TimelineEvent[]` stored as **`events`**; extend the union later; no parallel investigation-only event type.

---

## 4. Data model

### 4.0 Naming (resolved)

**Single field: `events`** (`TimelineEvent[]`) on both `Conversation` and `TimelineConversation`.

| Layer | Field | Notes |
|-------|-------|--------|
| **Elasticsearch / API** | `Conversation.events` | Canonical persisted chat |
| **Execution** | `TimelineConversation.events` | Same data; type omits legacy `rounds` |

Use `conversationToTimelineConversation()` or `resolveConversationEvents()` when entering the agent pipeline from a rounds-based `Conversation`.

### 4.1 Elasticsearch (conversation document)

Add to `ConversationProperties` / index schema:

```typescript
// Canonical chat for group / investigation conversations (ES field name)
events?: TimelineEvent[];

// Collaboration (B5) — no members[]; see access model doc
conversation_mode?: 'single' | 'group';

// Legacy — keep for single-user + rollback
conversation_rounds: PersistentConversationRound[];
```

**Storage shape (POC):** `events` as `types.object({ dynamic: true })` or strict nested mapping later. **Must** persist `user` on `user_message` events (fix vs removed schema).

**Deferred (not B5 POC):** `execution_state`, optimistic locking version field, CRDT — use existing HITL/pending execution on timeline until needed.

### 4.2 In-memory / API types

```typescript
// Persisted on Conversation (group mode)
interface ConversationCollaborationFields {
  events?: TimelineEvent[];
  conversation_mode?: 'single' | 'group';
}

// Execution (#259692 — unchanged field name)
type TimelineConversation = Omit<Conversation, 'rounds' | 'events'> & {
  events: TimelineEvent[];
};
```

- **`single` (default):** today’s behavior; may continue persisting `conversation_rounds` only.
- **`group`:** must have **`events`** persisted; converse passes **`events`** into the agent pipeline.

### 4.3 Create flow

When creating a **group** investigation (POC: flag on create or promote later):

```typescript
{
  conversation_mode: 'group', // until template_snapshot.chat_mode from B2
  events: [],
}
```

Owner remains on `Conversation.user` for compatibility (billing, telemetry, “created by”).

---

## 5. Read / write paths

### 5.1 Load (`ConversationClient.get`)

```
if conversation_mode === 'group' && events?.length
  → Conversation with events authoritative; `resolveConversationEvents()` for execution
else if conversation_rounds?.length
  → return Conversation with rounds (legacy)
  → optional: derive timeline via roundsToTimelineEvents for UI only
else
  → empty conversation
```

### 5.2 Persist after agent run (group)

Today: `updateConversation$` appends **`rounds`**.

**B5 (group):** append/update **`events`**:

1. Append new `UserMessageEvent` (with **requesting user**).
2. Append/update `AgentExecutionEvent` from round complete.
3. Write **`events`** to ES.
4. **Optional POC:** skip writing `conversation_rounds` for `group` mode (or dual-write for debugging only — not for read path).

### 5.3 Append human message (no agent)

New path — **does not** call full `executeAgent` pipeline:

1. Authz: caller can append per [access model](./agent_builder_option_b_access_model.md) (space + template write privileges).
2. Append `UserMessageEvent` to **`events`**.
3. Persist document (OCC via existing `_seq_no`).
4. Emit **`conversation_updated`** (or dedicated SSE) for subscribers.
5. Run **trigger hook** — for append-only, hook returns `{ invoke: false }`.

---

## 6. Trigger hooks (restore pattern, reimplement)

From removed `group_hook.ts` — same product semantics:

```typescript
interface AgentTriggerHook {
  (input: {
    conversation: TimelineConversation;
    newEvents: TimelineEvent[];
  }): Promise<{ invoke: boolean }>;
}

// group mode
const groupTriggerHook: … = async ({ newEvents }) => {
  const lastUser = [...newEvents].reverse().find(isUserMessageEvent);
  if (!lastUser) return { invoke: false };
  return { invoke: lastUser.message.includes('@agent') };
};

// single mode
const singleUserTriggerHook: … = async () => ({ invoke: true });
```

**Integration point:** converse handler after append, before `executeAgent`:

```
append user message to events
hook = resolveHook(conversation_mode)
if !hook.invoke → persist + return (stream ends)
else → executeAgent({ conversation: conversationToTimelineConversation(conv) })
```

**POC simplification:** substring `@agent` match (same as removed MVP). Product can refine to mention token / structured trigger later.

---

## 7. Authorization

**Canonical spec:** [agent_builder_option_b_access_model.md](./agent_builder_option_b_access_model.md)

Summary:

| Action | Personal (`chat_mode: single`) | Investigation (`chat_mode: collaborative`) |
|--------|----------------------------------|----------------------------------------|
| List / get | Creator | Privileged users in **same space** |
| Append / `@agent` | Creator | Users with template **write** privileges |
| PATCH metadata | Creator | Same as append (POC) |
| Delete | Creator | Creator only (POC) |

Authorship on each human turn: **`UserMessageEvent.user`** — not a membership list.

### 7.1 vs removed #259692 ACL

| Removed | B5 (revised) |
|---------|----------------|
| `conversation_mode === 'group'` ⇒ any space user, no gate | **`chat_mode: collaborative`** on template-backed investigations + privilege checks |
| No `user` on persisted messages | **`user` on `user_message` in ES** |

---

## 8. API surface (POC)

### 8.1 Existing (extend)

| Route | Change |
|-------|--------|
| `POST …/converse` / `…/converse/async` | Load timeline for group convs; append user event; hook; maybe run agent |
| `GET …/conversations/{id}` | Return **`events`** when present |
| `POST …/conversations` (create) | Accept optional `template_id`, `conversation_mode`, initial **`events`** |

### 8.2 New (recommended)

Explicit append keeps semantics clear for UI polling:

```
POST /api/agent_builder/conversations/{id}/messages
Body: { message, attachment_refs? }
Response: { conversation_id, event: UserMessageEvent }
```

Internally shares persistence with converse; converse adds hook + agent execution.

**Alternative (smaller diff):** query flag on converse `?invoke_agent=false` — worse UX/docs; prefer dedicated route if platform agrees.

---

## 9. UI (minimal B5 — full shell in B1)

| Surface | B5 need |
|---------|---------|
| Composer | Show **author** on messages when **`events`** has `user` |
| Group indicator | “Shared investigation” when `conversation_mode === 'group'` |
| `@agent` hint | Placeholder text in group mode |
| Realtime | Poll or subscribe on `conversation_updated` (SSE optional POC stretch) |

Full detail page tabs remain **B1**; B5 can land with flyout/chat only for lab validation.

---

## 10. Backward compatibility

| Scenario | Behavior |
|----------|----------|
| Existing docs with only `conversation_rounds` | Unchanged single-user path |
| New group investigation | Writes **`events`**; reads **`events`** |
| Mixed doc (both fields) | **`group` ⇒ `events` wins**; ignore rounds for display |
| `roundsToTimelineEvents` | Keep for legacy read + single-user; **do not** use as write path for group |

No required ES reindex for existing conversations in POC.

---

## 11. Implementation phases (within B5)

| Sub-phase | Deliverable | Validates |
|-----------|-------------|-----------|
| **B5.1** | ES **`events`** + converters round-trip **`user` on user_message** | Reload preserves authors |
| **B5.2** | Space ACL for template-backed investigations — [access model](./agent_builder_option_b_access_model.md) | Cross-analyst open by URL in same space |
| **B5.3** | Append message route + persist without agent | Two users, two messages, no agent |
| **B5.4** | Trigger hooks + converse invokes agent on `@agent` only | SOC pair lab script |
| **B5.5** | UI author labels + group composer + poll/refresh | **Required for E2E POC demo** |

**Exit criteria (B5 done):** Two analysts in **same space**; both append messages; reload shows correct authors; agent runs only when message contains `@agent`; wrong space / missing write privilege denied.

**E2E POC:** B5 + B1-min — see [implementation plan § E2E POC demo](./agent_builder_option_b_implementation_plan.md#e2e-poc-demo-north-star).

---

## 17. E2E POC experience (product intent)

This B5 work is **in scope for the Option B POC**, not a post-POC platform follow-up. The demo must be **feelable**:

| Moment | What the viewer sees |
|--------|----------------------|
| Open investigation | Detail layout: Activity + sidebar `custom_fields` |
| Analyst A types | Message appears; **no** agent spinner |
| Analyst B joins | Same thread; **name on each human message** |
| `@agent` | Single agent run; answer in Activity |
| Reload | Authors + metadata survive |

**Minimum UI (B5.5 + B1-min):** do not ship B5 backend-only — without author labels the SOC pair story is invisible.

**Defer:** threads tab (placeholder OK), Cases chip (N1 stretch), templates (B2).

---

## 12. Files (expected touch list)

| Area | Files |
|------|--------|
| Types | `agent-builder-common/chat/conversation.ts`, `conversation_metadata.ts` (members type — or new `collaboration.ts`) |
| ES | `conversation/client/storage.ts`, `converters.ts`, `types.ts` |
| Client | `conversation/client/client.ts` (`hasAccess`, list query) |
| Execution | `execution/utils/conversations.ts`, `execution_runner.ts`, new `trigger_hooks/` |
| Routes | `routes/chat.ts`, new `routes/conversation_messages.ts` (or internal) |
| Tests | `converters.test.ts`, ACL tests, hook unit tests |

---

## 13. Coordination with @pgayvallet (#259692)

**Resolved for POC:** **`events`** (`TimelineEvent[]`) is the single canonical field for persistence, API, and execution. Coordinate with @pgayvallet to align #259692 upstream on the same name (replacing `TimelineConversation.timeline`).

**Still confirm:**

1. Is platform planning to land persistence on `main` soon? (avoid duplicate B5 on fork)
2. OK to **skip `conversation_rounds` write** for `group` mode in POC?
3. Preferred API: dedicated **`/messages`** vs extended converse?
4. Any objection to **space-scoped investigations** (privilege-gated) vs per-conversation invite lists?

**Offer:** Option B POC implements B5 on `option-b-poc`; upstreamable PRs split by B5.1–B5.4 for platform review.

---

## 14. Out of scope (B5)

- **B4 threads** (child conversations)
- **B1** full detail shell
- **N1** case attachment
- **`execution_state`** / multi-tab agent lock
- Space-wide group ACL (explicitly rejected)
- Cherry-pick `7df805f^` or `93c149dea915` persistence as-is

---

## 15. Test plan (lab)

1. User A creates space-scoped investigation from incident template in Space `soc`.
2. User A posts `"seeing lateral movement"` → no agent run → persists.
3. User B posts `"agree, checking hosts"` → no agent run → persists.
4. Reload — both messages show **A / B** authors.
5. User B posts `"@agent summarize next steps"` → agent runs once.
6. User C in **different space** GET → 404.
7. User D in same space without write privilege → append rejected (read OK when read privilege exists).
7. Single-user conversation regression: existing converse + reload unchanged.

---

## 16. Risks

| Risk | Mitigation |
|------|------------|
| Platform lands conflicting schema | Sync early (§13); align naming |
| Dual-write drift | **Single read source** per mode |
| Converse API ambiguity | Dedicated append route |
| Realtime without SSE | Polling in POC; SSE follow-up |

---

*Drafted: 2026-06-01 — Option B POC*
