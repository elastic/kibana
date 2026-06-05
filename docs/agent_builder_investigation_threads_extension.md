# Appendix G — Threads (investigation sub-conversations)

**Status:** Draft  
**Revision:** 2026-06-01 — Aligned with [§4.3.4](./agent_builder_investigation_cases_proposal.md#434-threads-investigation-sub-conversations) and [§4.8](./agent_builder_investigation_cases_proposal.md#48-phased-delivery-option-b-poc) in [agent_builder_investigation_cases_proposal.md](./agent_builder_investigation_cases_proposal.md).  
**Primary use case:** SOC pair investigating together on one incident.

> **Canonical spec:** [agent_builder_investigation_cases_proposal.md](./agent_builder_investigation_cases_proposal.md) (§4.3.2 data model, §4.3.4 threads, §4.8 phasing, §9 resolutions).  
> This appendix adds disambiguation, branch comparison, API sketches, and review aids.

---

## G.1 Disambiguation

| Term | Option B meaning | Not the same as |
|------|------------------|-----------------|
| **Investigation thread** | Child **Conversation** (`parent_conversation_id` / `child_conversation_ids[]`) | `VersionedAttachment`, `AttachmentGroup` / `group_id` |
| **Timeline event** | `events[]` entry (human, workflow, system) | A thread |
| **Branch** (B4b) | Alternate agent path in **one** conversation | Default thread model |

**Product language:** **Thread** = child conversation. **Branch** = “retry / explore alternative from here” inside one chat (optional, later).

---

## G.2 Why threads for SOC + Conversation-as-Case

- **Parent** — incident record: template, `custom_fields`, assignees, case chip, main Activity.
- **Child thread** — containment, host deep-dive, FP check: own Activity, optional assignee, without noise on parent feed.

Cross-thread evidence: **pinned / linked attachments** (`VersionedAttachment.pinned`, `case`, `conversation` types), re-attach on parent (Option B). Option C folder only if #14200 requires Project.

---

## G.3 Implementation notes (extends §4.3.2 / §4.3.4)

### G.3.1 Fields (full `Conversation` threading block)

See §4.3.2 in the main proposal. Additional implementation notes:

| Field | Note |
|-------|------|
| `thread_kind` | `containment` \| `deep_dive` \| `false_positive` \| `generic` — drives default title / template |
| `fork.history_mode` | `copy_prefix` \| `empty` — whether events/rounds through `fork_anchor_id` are copied |
| `fork.fork_anchor_id` | Prefer `event_id` when [#259692](https://github.com/elastic/kibana/pull/259692) timeline is available |

### G.3.2 Parent/child rules (detail)

| Rule | Behavior |
|------|----------|
| **Create thread** | Copy-on-create; optional history prefix |
| **custom_fields** | Snapshot only; banner “Inherited from parent at fork” optional |
| **access** | Copy parent `template_snapshot` (incl. `chat_mode`) at create |
| **case attachment** | Re-attach same `case_id`; refresh snapshot |
| **Depth** | One level in B4 |

### G.3.3 #259692 and delivery order

- Dual-write `events[]` + `rounds[]` on parent and child during migration.
- **Do not ship B4 Threads UI before B5** unless #259692 group ACL is merged and enabled.

---

## G.4 UX detail (Threads tab)

**Parent**

- List: `thread_title`, `thread_kind`, last activity, assignees, status.
- **New thread:** kind picker + “Include history up to current message”.
- Open child → full Conversation detail (no nested Threads tab in B4).

**Child**

- `Conversations > {template} > {parent title} > Thread: {thread_title}`
- Banner: parent link, `fork.forked_at`, `fork.forked_by`

**SOC flows**

1. Split work — “Start thread from here” → partner owns child.
2. Shared triage — both on parent `events[]`; `@agent` per group hook.
3. Evidence — attachments on parent or child; parent **pinned attachments** surface key findings from child.

---

## G.5 Branches vs threads (B4b)

| | **Thread** | **Branch** (B4b) |
|---|------------|-------------------|
| Id | New `conversation_id` | Same `conversation_id`, `branch_id` |
| Scope | Different workstream / assignee | Same scope, compare agent answers |
| UI | Threads tab + child page | Variant switcher on one page |
| SOC MVP | **Yes** | Defer; “thread with history” substitutes |

---

## G.6 API (illustrative)

```http
POST /api/agent_builder/conversations/{parentId}/threads
Content-Type: application/json

{
  "title": "Host isolation",
  "thread_kind": "containment",
  "history_mode": "copy_prefix",
  "fork_anchor_id": "evt_abc123",
  "template_id": "containment-v1"
}
```

```http
GET /api/agent_builder/conversations/{id}/threads
```

- `converse` — unchanged; targets child `conversation_id` like any conversation.
- Activity federation (B3) — parent rollup `thread_created` / `thread_updated`; Cases dual-write when case attached.
- Workflows (B6) — `conversation.thread.created`, `conversation.thread.closed`; `workflow_ids` may copy to child at create.

---

## G.7 Open questions (cross-ref §9)

| # | Resolution |
|---|------------|
| 2 | Copy-on-create; no live-sync |
| 7 | Multi-poster in space for investigation templates |
| — | One-level depth; case re-attach on child |
| — | Option B threads vs Option C Project chats |

---

## G.8 Phasing (mirrors §4.8)

B0 → B1 (Threads placeholder) → B2 → B3 → **B5** → **B4** → B4b (optional) → B6.

---

## G.9 Success metrics

See [§10](./agent_builder_investigation_cases_proposal.md#10-success-metrics-threads--add-to-option-b-poc) in the main proposal.

---

## G.10 Risks

See [§11](./agent_builder_investigation_cases_proposal.md#11-risks-threads--add-to-prd) in the main proposal.

---

## G.11 One-pager (Appendix F supplement)

| Question | Answer |
|----------|--------|
| What is a Thread? | Child **Conversation** (`parent_conversation_id`) |
| SOC pattern? | Shared **parent** + **child** threads for parallel work |
| Copy vs sync? | **Copy-on-create** |
| Depends on? | Option B + #259692 + [space access model](./agent_builder_option_b_access_model.md) |
| Branches? | Optional B4b; threads first |
| Attachments as threads? | **No** |

---

*Synced into [`agent-builder-projects-prd.docx`](./agent-builder-projects-prd.docx) on 2026-06-01 (§4.3.4, B5 before B4, §9 #2/#7 resolved). Markdown remains the editable source for detailed reviews.*
