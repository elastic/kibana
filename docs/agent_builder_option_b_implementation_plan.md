# Option B — Implementation Plan (Conversation as Case)

**Status:** Active  
**Architecture:** [agent_builder_investigation_cases_proposal.md](./agent_builder_investigation_cases_proposal.md)  
**Threads:** [agent_builder_investigation_threads_extension.md](./agent_builder_investigation_threads_extension.md)  
**PRD:** [agent-builder-projects-prd.docx](./agent-builder-projects-prd.docx)

**Primary use case:** SOC pair investigating together on one incident.

**Base for POC:** [#259692](https://github.com/elastic/kibana/pull/259692) multi-user timeline — branch `pr-259692-multi-user` (fetched locally).  
**Integration:** [agent_builder_option_b_259692_integration.md](./agent_builder_option_b_259692_integration.md)

---

## Stack (revised)

```
#259692 timeline execution (UserMessageEvent + AgentExecutionEvent)
        ↓
B0 conversation metadata (custom_fields, template_id)
        ↓
B5 persistence + group ACL + @agent trigger  ← restore / implement on top of #259692
        ↓
B1 detail UX (Activity = timeline)
        ↓
N1 case attachment · B2 templates · B4 threads · B3/B6
```

**Do not build Option B POC on `main` alone** — execution path on `main` is still `rounds[]`-only without per-user `UserMessageEvent`.

---

## Current baseline

| Area | `main` | `pr-259692-multi-user` |
|------|--------|-------------------------|
| Single-user chat + `rounds[]` | ✅ | ✅ (legacy compat) |
| `TimelineEvent` / `UserMessageEvent.user` | ❌ | ✅ |
| Execution on timeline | ❌ | ✅ (`agents/modes/…`) |
| ES persist timeline + group ACL | ❌ | ❌ (removed in PR cleanup) |
| Conversation metadata | B0 WIP on `main` | **On `option-b-poc`** |
| Multi-user UI | ❌ | ❌ |

---

## Delivery strategy

Build the POC **on branch `option-b-poc` from `pr-259692-multi-user`**, not from `main`.

```
#259692 base ──► B0 metadata ──► B5 persist + ACL + group converse
                      │
                      ├──► B1 detail shell (timeline Activity)
                      ├──► N1 case attachment + B2 templates
                      └──► B4 threads (after B5)
```

**Critical path for SOC pair:** **#259692** → B5 (multi-user persist + ACL) → B1 → B4.

---

## Phase breakdown

### Near-term (no Option B letter — continue now)

| ID | Deliverable | Owner | Key work |
|----|-------------|-------|----------|
| **N1** | Case attachment + Case → Start investigation | AB + Cases/Security | Register `case` attachment type; snapshot on attach; entry from Case detail; **`pinned` on VersionedAttachment** for key evidence |
| **N2** | `@assistant` → AICommentAttachment on Cases activity log | Cases + AB | Audited AI on Case during migration |
| **N3** | Align #14200 labels/pins without Project-as-Case | AB | Labels on conversation; defer Project SO |

### B0 — Conversation metadata (on #259692 branch)

**Goal:** Persist structured workspace metadata alongside timeline — **not** a parallel chat event model. Domain-neutral (incident, hunt, observability, general); Option B is the Security/Cases **application** of this layer.

| Item | Detail |
|------|--------|
| Types | `ConversationMetadataFields`: `template_id`, `custom_fields` only |
| Chat timeline | **`events`** (`TimelineEvent[]`) — canonical for persist + execution |
| ES schema | Metadata fields + (B5) **`events`** for group chat |
| API | Internal `PATCH …/conversations/{id}` (title + metadata allowlist; `_rename` kept for compat) |
| Branch | Apply on `option-b-poc` from `pr-259692-multi-user` |

**Files (B0):**

- `agent-builder-common/chat/conversation_metadata.ts` (new)
- `agent-builder-common/chat/conversation.ts`
- `agent-builder-common/chat/index.ts`
- `agent_builder/.../conversation/client/storage.ts`
- `agent_builder/.../conversation/client/converters.ts`
- `agent_builder/.../conversation/client/types.ts`
- `agent_builder/.../routes/internal/conversations.ts`
- `agent_builder/common/http_api/conversations.ts`

**Exit criteria:** PATCH metadata on a conversation; fields survive get/list; existing converse unchanged.

### B1 — Conversation detail shell

**Goal:** Full-page investigation UX (not flyout-only chat).

| Item | Detail |
|------|--------|
| Layout | Two-column: main tabs + sidebar (fields, assignees placeholder, agent) |
| Tabs | Activity · Attachments · Threads (placeholder) · Knowledge (placeholder) |
| Activity | Merge `events[]` + `rounds[]` in one feed (rounds-only OK until B5) |
| Route | Extend `/agents/:agentId/conversations/:conversationId` or new `/investigations/:id` |
| Reuse | Existing `ConversationRounds`, attachment panels, header |

**Exit criteria:** Usability walkthrough — open conversation detail, see tabs, edit `custom_fields` in sidebar, chat in Activity tab.

### B2 — ConversationTemplate + access

| Item | Detail |
|------|--------|
| SO / index | `ConversationTemplate` + privilege fields — see [access model](./agent_builder_option_b_access_model.md) |
| API | CRUD templates (authz-filtered); create-from-template writes **`template_snapshot`** |
| UI | Create-from-template; picker filtered by role |
| Seed | `incident-triage-v2`: `chat_mode: collaborative` |

**Exit criteria:** Create investigation from template; `custom_fields` + `template_snapshot` stored; space-scoped list includes it for peers in space.

**B2.1:** Register `use_*` / `write_*` investigation template privileges.

### B3 — Cases Activity federation

| Item | Detail |
|------|--------|
| Trigger | When `case` attachment present on conversation |
| Read | Federate Cases UserActions into Activity feed |
| Write | Mirror `thread_created`, key workflow events (dual-write until compliance sign-off) |

**Depends on:** N1 case attachment.

### B5 — Multi-user chat (on #259692 + persistence)

**Goal:** SOC pair can share an investigation — **required before threads**.

**Design addendum:** [agent_builder_option_b_b5_design.md](./agent_builder_option_b_b5_design.md) (canonical B5 spec — do **not** cherry-pick removed #259692 persistence commits).

| Item | Detail |
|------|--------|
| From #259692 | Timeline execution, `UserMessageEvent.user`, prepare/compaction on timeline |
| Persist | ES **`events`** (`TimelineEvent[]`) as canonical for `group` mode |
| Execution | **`events`** on `Conversation` / `TimelineConversation` (#259692) |
| ACL | **Space + template privileges** — [access model](./agent_builder_option_b_access_model.md) (no `members[]`) |
| Converse | Append user messages without agent; **`@agent` trigger hook** |
| API | Extend converse + **`POST …/conversations/{id}/messages`** (see B5 doc) |
| Coordinate | @pgayvallet — **`events`** field name aligned with removed PR persistence |

**Exit criteria:** Two analysts in same space post in shared investigation; reload preserves message authors; agent runs on `@agent` only; wrong space denied.

**Sub-phases:** B5.1 persist events → **B5.2 space ACL** ✅ → B5.3 append → B5.4 hooks → B5.5 UI.

### B4 — Threads

See §4.3.4 in architecture doc. Copy-on-create child conversations; `POST …/threads`; Threads tab. Cross-thread evidence via **pinned attachments** and optional `conversation` attachment type (link to child), not metadata `reference_items`.

**Depends on:** B5.

### B6 — ITSM + workflows

| Item | Detail |
|------|--------|
| Fields | `workflow_ids`, `connection_ids`, `itsm` on Conversation |
| Triggers | `conversation.*` (e.g. `conversation.thread.created`) |
| UI | Push to Jira via Workflows + Connectors v2 |

---

## Slice 1 (current sprint)

1. ✅ Implementation plan + [#259692 integration doc](./agent_builder_option_b_259692_integration.md)
2. ✅ Fetch `pr-259692-multi-user` locally
3. ✅ B0 metadata types (no parallel `events[]`) — on `option-b-poc`
4. ✅ `option-b-poc` from `pr-259692-multi-user` + B0 diff
5. ✅ [B5 design](./agent_builder_option_b_b5_design.md)
6. 🔄 **E2E POC build** — B5.1→B5.5 + thin B1 (see below)

---

## E2E POC demo (north star)

**Goal:** Show Option B end-to-end — shared investigation, structured metadata, human + agent Activity — in a lab demo **without** waiting for Cases merge or full Case detail parity.

### In scope for demo

| Piece | Phase | Demo value |
|-------|-------|------------|
| Metadata sidebar (`custom_fields`, PATCH) | B0 ✅ | “Investigation record” |
| **Timeline persist + authors** | B5.1 | Reload shows who said what (`events` in ES) |
| **Space ACL + template snapshot** | B5.2 ✅ | `incident-triage-v2` → space-scoped list/get |
| **Append without agent** | B5.3 | SOC pair chat |
| **`@agent` only** | B5.4 | Controlled agent runs |
| **Author labels + group composer** | B5.5 | Visible e2e UX |
| **Thin detail shell** (tabs + sidebar) | B1-min | Not flyout-only |
| Case attachment + Start investigation | N1 | Optional stretch — strong story if time |

### Out of demo scope (follow-on)

B2 templates · B4 threads · B3 Cases federation · B6 ITSM · full cases-projects mockup parity

### Build order

```
B5.1 persist events  ← in progress
  → B5.2 space ACL (+ template snapshot fields) ✅
  → B5.3 POST /messages
  → B5.4 trigger hooks + group converse
  → B5.5 UI authors (required for demo, not stretch)
  → B1-min shell (Activity + sidebar + Attachments tab)
  → N1 (if time)
```

### Demo script (target)

1. Analyst A opens **group investigation** (custom fields in sidebar).
2. A posts triage note — **no agent**.
3. Analyst B (same space) opens same URL — sees A’s message with **author**.
4. B posts follow-up — still no agent.
5. B sends `@agent summarize findings` — **one** agent run.
6. Reload — timeline + metadata intact; analyst in **another space** gets 404.

---

## Slice 2 — N1 + B2 (post-demo hardening)

1. Case attachment type + Security Case detail → Start investigation
2. `ConversationTemplate` + create-from-template + `template_snapshot`

**Was “Slice 2 demo” — deprioritized until E2E group chat lands.**

---

## Slice 3 — B4 threads

1. Threads API + Threads tab (after B5 demo)
2. Lab validation per architecture §10

---

## Dependencies & coordination

| Dependency | Team / artifact | Blocks |
|------------|-----------------|--------|
| #259692 | Agent Builder platform | B5, B4 |
| #14201 | Product spec | B5 UX |
| Case attachment / UserActions | Cases + Security | N1, B3 |
| CaseTemplate mapping | Cases | B2 |
| Workflows `conversation.*` | Workflows platform | B6 |

---

## Risk register (implementation)

| Risk | Mitigation |
|------|------------|
| B1 scope = full Case detail | Shell first; placeholder tabs; reuse chat components |
| #259692 not merged | B0–B3 shippable single-user; do not ship B4 until B5 |
| ES schema churn | Optional fields only; no migration required for existing docs |
| Two UX surfaces (flyout + detail) | Detail becomes primary; flyout embeds Activity tab only |

---

## Tracking

Use GitHub issues/epics aligned to B0–B6 + N1–N3. Link PRs to phase labels.

| Phase | Issue (create) | PR |
|-------|----------------|-----|
| B0 | TBD | In progress |
| B1 | TBD | — |
| N1 | TBD | — |

---

*Last updated: 2026-06-01*
