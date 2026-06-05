# Option B POC on #259692 multi-user chat — integration guide

**Status:** Draft  
**Base branch (fetched locally):** `pr-259692-multi-user` ← `pgayvallet/ab-xxx-multi-user-conv-stage-1`  
**PR:** [#259692](https://github.com/elastic/kibana/pull/259692)

---

## Intent

Build the **Conversation as Case** POC **on top of** the multi-user / timeline execution work in #259692 — not as a parallel stack on `main`.

---

## What #259692 provides today (final branch state)

After cleanup commits (including *“remove changes to persistence layer”*), the branch delivers:

| Capability | In #259692? | Notes |
|------------|-------------|--------|
| `TimelineEvent` (`user_message`, `agent_execution`) | ✅ | `UserMessageEvent` carries **`user: UserIdAndName`** per message — key for SOC pair |
| `TimelineConversation` + converters | ✅ | `timeline_converters.ts`, `rounds ↔ timeline` |
| Execution on timeline | ✅ | `agents/modes/utils/prepare_conversation.ts`, compaction, LangChain, etc. |
| Dual-write to ES `events` / group ACL | ❌ | **Removed** in `7df805f` / `dd578db4` — see [B5 design](./agent_builder_option_b_b5_design.md) for POC replacement |
| `ConversationMode` / `AgentTriggerHook` (@agent) | ❌ | Not in final branch (was in earlier iterations) |
| Multi-user UI | ❌ | Execution-ready; persistence + ACL still needed |

**Important:** #259692 is **Phase 1 execution + types**. Full multi-user chat still needs **persistence + ACL + converse append + UI** (your POC or #259763).

---

## What Option B adds on top

| Layer | Source | Fields / features |
|-------|--------|-------------------|
| **Timeline (chat)** | #259692 + B5 | **`events`** (`TimelineEvent[]`) — persist, API, and execution |
| **Metadata record** | Option B B0+ | `template_id`, `custom_fields` (`ConversationMetadataFields`); `template_snapshot` in B2; pins via attachments |
| **Collaboration ACL** | Option B B5 | Space + template privileges — [access model](./agent_builder_option_b_access_model.md) |
| **Threads** | Option B B4 | `parent_conversation_id`, `child_conversation_ids[]`, fork metadata |
| **Case bridge** | N1 | `case` attachment type |
| **ITSM** | B6 | `workflow_ids`, `itsm` |

**Do not** introduce a second event model (`ConversationEvent` parallel to `TimelineEvent`). Extend the timeline union for investigation-only events when needed:

```typescript
// Future — extend #259692 union, do not replace
type InvestigationTimelineEvent =
  | TimelineEvent  // user_message | agent_execution
  | WorkflowEvent
  | ThreadCreatedEvent
  | CasesFederatedEvent;
```

---

## Recommended branch strategy

```bash
# Already fetched:
# git fetch https://github.com/pgayvallet/kibana.git ab-xxx-multi-user-conv-stage-1:pr-259692-multi-user

git checkout -b option-b-poc pr-259692-multi-user
# Apply Option B conversation metadata (B0) on this branch — NOT on main alone
```

1. **Branch from `pr-259692-multi-user`** (not `main`).
2. Port **B0** metadata fields (`custom_fields`, `template_id`) — **no separate `events[]`**; evidence via attachments.
3. **Restore / implement B5** per [agent_builder_option_b_b5_design.md](./agent_builder_option_b_b5_design.md) (not cherry-pick `7df805f^`):
   - ES / API / execution: **`events`** (canonical for group mode)
   - `conversation_mode` / `template_snapshot.chat_mode` for `@agent` gate
   - **`template_snapshot.chat_mode: collaborative`** for team list/get in space
   - Member ACL in `ConversationClient`
   - Append message + `@agent` trigger hook on group converse
4. **B1** detail shell reads **`events`**, not `rounds[]` only.
5. **B4** threads fork on `UserMessageEvent.id` / timeline index.

---

## Merge order (avoid rework)

```
1. #259692 merge (or option-b-poc branch)     ← timeline execution
2. B0 conversation metadata on Conversation   ← custom_fields, templates, refs
3. B5 persistence + ACL + group converse       ← multi-user SOC (restore PR persistence or reimplement)
4. B1 detail UX                                ← Activity = timeline + federated events
5. N1 case attachment + B2 templates
6. B4 threads
7. B3 Cases federation + B6 ITSM
```

---

## Conflict: our early B0 on `main`

The first B0 slice on `main` added a parallel `events?: ConversationEvent[]`. **Remove that** when building on #259692; use **`TimelineEvent[]` persisted as `events`** (not a separate investigation event type).

Metadata fields to **keep** in B0 (types in `conversation_metadata.ts` as `ConversationMetadataFields`):

- `template_id` (pointer only until B2 templates)
- `custom_fields`

**Deferred to B2:** `template_snapshot` — captured on create-from-template, not PATCHable metadata.

**Use attachments instead of `reference_items`:** extend `VersionedAttachment` with `pinned` (N1+); add types such as `case`, `conversation` (child thread link) for cross-thread evidence.

---

## Coordination

| With | Ask |
|------|-----|
| @pgayvallet / AB platform | Merge timeline to main; share persistence/ACL commits removed in `7df805f` |
| #259763 | UI multi-user POC — overlap with B1/B5 |
| Cases team | N1 case attachment, B3 UserActions federation |

---

## POC demo script (target)

1. Two analysts open **group** investigation (shared ACL).
2. Both post **user_message** events; agent runs only on `@agent`.
3. Sidebar shows **custom_fields** from template.
4. **Case** attachment chip; optional thread for containment.

---

*Last updated: 2026-06-01*
