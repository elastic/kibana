# Investigation / Cases in Agent Builder — Architecture (in-repo)

**Status:** Draft — architecture exploration  
**Revisions:** 2026-06-01 — Added §4.3.4 Threads (SOC pair; child conversations); B5 before B4; resolved §9 #2 (copy-on-create).  
**Related:** [Appendix G — Threads](./agent_builder_investigation_threads_extension.md) (API detail, risks, metrics)  
**Implementation plan:** [agent_builder_option_b_implementation_plan.md](./agent_builder_option_b_implementation_plan.md) (B0–B6 execution)  
**External PRD:** [`docs/agent-builder-projects-prd.docx`](./agent-builder-projects-prd.docx) (full Options A/B/C, appendices A–F; synced 2026-06-01 with §4.3.4 / B5→B4). Copy also at `~/Downloads/agent-builder-projects-prd.docx`.

**North star:** Option B — **Conversation as Case** (investigation record on Conversation detail UX).  
**Primary use case:** SOC pair (or small team) investigating together on one incident.

---

## 1. Executive summary (abbreviated)

Kibana Cases and Agent Builder Conversations converge for security and observability investigations. The tactical bridge already exists: **case attachment** on Conversations (same pattern as alerts/rules).

| Option | Container | Status |
|--------|-----------|--------|
| **A** Case as Project | Cases SO (`case.project`) | If product mandates one Case id for everything |
| **B** Conversation as Case | AB Conversation | **Primary long-term; planned POC** |
| **C** Project as Case | AB Project + Conversation | If #14200 requires folder + cross-chat ITSM |

**Option B:** Conversation detail is the investigation — templates, assignees, Activity, Attachments, **Threads**, Knowledge. Legacy Cases attach via case attachment. **Threads** (§4.3.4) are child Conversations for parallel SOC workstreams, not attachments.

**Platform vs product naming:** B0 persists **conversation metadata** (`ConversationMetadataFields`) — domain-neutral structured fields on any long-lived chat. **Option B** applies that layer to Security/Cases UX; hunt, observability RCA, and `general` workspaces use the same types via `ConversationTemplate.profile`.

---

## 4.3 Option B — Conversation as Case (primary, planned POC)

Conversation is the collaboration and investigation unit — like a Case saved object — with `ConversationTemplate`, custom fields, Activity (`events[]` + `rounds[]`), Attachments, Threads, Knowledge, assignees, workflows, optional ITSM. Matches cases-projects mockup. No AB Project required for Option B.

### 4.3.1 UX mapping (cases-projects mockup → Conversation)

| Mockup | Option B |
|--------|----------|
| Breadcrumb `PROJ-42 > CASE-4821` | `Conversations > {template} > CONV-{id} > {case chip}` |
| Tabs: Activity / Attachments / Conversations / Knowledge | Activity / Attachments / **Threads** / Knowledge |
| Sidebar: fields, assignees, workflows, Jira, agent | `custom_fields`, `assignees`, `workflow_ids`, `itsm`, `agent_id` |
| Created from template | `template_id` (B0); + `template_snapshot` on create (B2) |
| Thread child | Breadcrumb: `… > {parent} > Thread: {thread_title}` |

### 4.3.2 Conversation extensions (vs AB today)

**Today:** `id`, `agent_id`, `user`, `title`, `rounds[]`, `attachments[]`.

**Option B adds:**

```typescript
interface Conversation {
  id: string;
  agent_id: string;
  user: UserIdAndName;
  title: string;
  created_at: string;
  updated_at: string;
  rounds: ConversationRound[];
  attachments?: VersionedAttachment[]; // extend with pinned?, case, conversation link types

  template_id?: string;
  /** B2: immutable snapshot of template at create time (field_definitions, profile, …) */
  template_snapshot?: TemplateSnapshot;
  custom_fields?: Record<string, unknown>;
  assignees?: UserIdAndName[];
  labels?: string[];

  /** Investigation threading — see §4.3.4 */
  parent_conversation_id?: string;
  child_conversation_ids?: string[];
  thread_kind?: 'containment' | 'deep_dive' | 'false_positive' | 'generic';
  thread_title?: string;
  fork?: {
    forked_at: string;
    forked_by: UserIdAndName;
    fork_anchor_id?: string; // event_id (preferred) or round_id
    history_mode: 'copy_prefix' | 'empty';
  };

  events?: ConversationEvent[];
  workflow_ids?: string[];
  connection_ids?: string[];
  itsm?: {
    severity?: string;
    status?: string;
    external_refs?: ExternalRef[];
  };
}

interface ConversationTemplate {
  id: string;
  profile: 'incident' | 'hunt' | 'investigation' | 'observability' | 'general';
  field_definitions: TemplateField[];
  defaults?: { suggested_agent_id?: string; initial_prompt?: string };
  required_privileges?: string[];
  write_privileges?: string[];
  /** `collaborative` ⇒ team-visible in space. */
  chat_mode: 'single' | 'collaborative';
}
```

See [access model](./agent_builder_option_b_access_model.md) for privilege and space ACL semantics.

**Timeline:** LLM work in `rounds[]`; human / workflow / system in `events[]` (or federate Cases UserActions while case attached — [#259692](https://github.com/elastic/kibana/pull/259692)).

**Cases bridge (tactical path):**

```typescript
interface CaseChatAttachment {
  type: 'case';
  case_id: string;
  owner: string;
  snapshot: { title?: string; status?: string; alerts?: unknown[] /* … */ };
}
```

### 4.3.3 What Option B does not claim

- Does not deprecate Cases SO on day one.
- Does not replace alert → case without a migration program.
- Activity is not `rounds[]`-only — must include non-LLM events.
- **Threads are not** versioned attachments (`group_id` chips) or in-conversation branches (optional B4b only).

### 4.3.4 Threads (investigation sub-conversations)

Threads let a SOC pair run **parallel workstreams on one incident** without one overloaded Activity feed. A **thread is a child Conversation** (`parent_conversation_id`), not an attachment.

#### Terminology

| Term | Meaning |
|------|---------|
| **Thread** | Child `Conversation`; own Activity, attachments; inherits parent `template_snapshot` (incl. `chat_mode`) at create |
| **Parent** | Main investigation (template, `custom_fields`, case chip, ITSM) |
| **Branch** (B4b, optional) | Alternate agent path **inside** one conversation — defer; use “thread with history” for POC |

#### Parent / child rules (resolves §9 #2)

| Rule | Behavior |
|------|----------|
| **Create** | New `conversation_id`; **copy-on-create**; optional history prefix through `fork_anchor_id` |
| **custom_fields** | Snapshot copied at create; **no live-sync** parent ↔ child |
| **template_id** | Same or thread-specific template per `thread_kind` |
| **assignees** | Optional metadata (Cases bridge); editable on child only |
| **access** | Copy parent **`template_snapshot`** at create — collaborative ⇒ team-visible in space — [access model](./agent_builder_option_b_access_model.md) |
| **case attachment** | Same `case_id` on child (refreshed snapshot); no second Cases SO |
| **Depth** | One level for POC (parent → children only) |
| **Evidence** | **Pinned attachments** on parent; re-attach or `conversation` link type on child — not attachment-as-thread |
| **Deletion** | Soft-delete child; parent `child_conversation_ids` tombstone or prune on archive |

**Rationale:** Copy-on-create preserves audit for SOC (“state at containment fork”) and avoids Cases Activity federation drift (B3).

#### Platform dependencies

- **Timeline:** `events[]` from [#259692](https://github.com/elastic/kibana/pull/259692); fork anchor prefers `event_id`.
- **Group chat:** Shared parent timeline; `@agent` via group `AgentTriggerHook`; child copies hook config at create.
- **Order:** **B5** (space ACL + collaborative `events`) before or with **B4** (threads).

#### UX (Conversation detail)

- **Threads tab (parent):** List children; **New thread** (kind + optional “include history up to here”).
- **Child:** Breadcrumb + banner to parent; Activity / Attachments / Knowledge — **no nested Threads tab** in B4.
- **SOC:** “Start thread from here” on Activity; shared triage on parent; containment / deep-dive on child.

#### API (B4, illustrative)

- `POST /api/agent_builder/conversations/{parentId}/threads`  
  Body: `{ title?, thread_kind?, history_mode?, fork_anchor_id?, template_id? }` → child `Conversation`
- `GET /api/agent_builder/conversations/{id}/threads` (or embedded in parent get)
- `converse` unchanged per conversation id

Parent Activity: rollup `thread_created` / `thread_updated` (not full child transcript). Cases: mirror `thread_created` when case attached (dual-write per §4.9). Workflows (B6): `conversation.thread.created`, `conversation.thread.closed`.

#### vs Option C

Threads replace “many chats under Project” for investigation under Option B. Option C uses Project + `conversation_ids[]` only if #14200 mandates a folder.

**Extended detail:** [Appendix G](./agent_builder_investigation_threads_extension.md).

---

## 4.8 Phased delivery (Option B POC)

**Near-term (all options):** N1 case/alert attachments · N2 `@assistant` on Cases activity log · N3 align #14200 / #14201 without Project-as-Case commitment.

| Phase | Deliverable |
|-------|-------------|
| **B0** | `template_id`, `custom_fields` (metadata); evidence via attachments (`pinned`, types) |
| **B1** | Conversation detail shell (Activity, Attachments, **Threads tab placeholder**, Knowledge) |
| **B2** | `ConversationTemplate` + create-from-template |
| **B3** | Federate Cases UserActions when case attached |
| **B5** | **Collaborative chat** + space ACL + `events[]` ([#259692](https://github.com/elastic/kibana/pull/259692)) — [access model](./agent_builder_option_b_access_model.md) |
| **B4** | **Threads:** `parent_conversation_id`, `child_conversation_ids[]`, create-thread API, fork metadata, Threads tab |
| **B4b** | (Optional) In-conversation branches on timeline |
| **B6** | `workflow_ids`, `connection_ids`, `itsm` on Conversation |

Appendix B POC slice: B1 + B2 + B3 → **B5** → **B4** → B6.

---

## 6. Multi-user model (with threads)

```
Cases SO (ITSM, optional)          AB Conversation (Option B)
├── UserActions (audit)            ├── events[] — human, workflow, system, thread_created
├── @assistant → AI comment        ├── rounds[] — agent, tools
└── Connectors                     ├── attachments[] — case, alert, …
                                   ├── template_snapshot.chat_mode — collaborative vs single
                                   └── child_conversation_ids[] — threads (§4.3.4)
```

Parent: collaborative investigation + shared triage. Child thread: copy **`template_snapshot`** (including `chat_mode`) at create.

---

## 7. Key user flows (Option B + threads)

1. Case detail → Start investigation → Conversation from template + case attachment.
2. Conversation detail → Activity, custom fields, playbook, Push to Jira (workflows).
3. **Thread** → child conversation for containment / deep-dive (**copy-on-create**, optional history prefix).
4. `@assistant` in timeline (+ mirror to Cases UserActions if case attached).
5. **SOC pair:** Lead opens containment thread from Activity; partner works child; both post on parent `events[]`; `@agent` per group hook.

---

## 9. Open questions (threads-related resolutions)

| # | Question | Resolution |
|---|----------|------------|
| **2** | Threads: copy-on-create vs live-sync `custom_fields` | **Copy-on-create**; no live-sync for POC |
| **7** | Group chat: read-only vs multi-poster | **Multi-poster** in space for investigation templates; read-only via separate read privilege (optional) |
| — | Parent/child depth | **One level** for POC |
| — | Thread vs attachment vs branch | **Thread** = child Conversation; see §4.3.4 / Appendix G |
| — | Threads vs Project (Option C) | Option B: threads on Conversation; C only if #14200 requires Project folder |

---

## 10. Success metrics (threads — add to Option B POC)

| Metric | Target |
|--------|--------|
| Incidents with ≥1 child thread (30d) | Track adoption |
| SOC lab: two analysts, parent + thread, no ACL errors | 100% |
| Thread visible to second assignee (P95) | &lt; 5s |
| Case attachment on parent and child after thread create | API test |

---

## 11. Risks (threads — add to PRD)

| Risk | Mitigation |
|------|------------|
| B4 before B5 | Gate threads on group ACL / #259692 |
| Thread vs attachment vs branch confusion | §4.3.4 terminology; UI “Sub-investigation” |
| Large history copy on thread create | Cap prefix; compact on first `@agent` in child |
| Fragmented Activity (parent + child) | Rollup events on parent; breadcrumb to child |

---

## Appendix index (in-repo)

| Doc | Contents |
|-----|----------|
| **This file** | Option B core + §4.3.4 Threads + updated §4.8 |
| [Appendix G](./agent_builder_investigation_threads_extension.md) | Disambiguation, branch vs thread, API bodies, Appendix F one-pager |

**Code reference:** `x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/conversation.ts`
