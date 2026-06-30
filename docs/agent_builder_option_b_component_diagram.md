# Option B — Component & Data Flow Diagram

**Legend:** ✅ implemented · 🔄 in progress · ❌ not started · `field` = ES/SO field

**Excalidraw diagrams:** [diagrams/](./agent_builder_option_b_diagrams/) — open `.excalidraw` files in [Excalidraw](https://excalidraw.com) or VS Code with the Excalidraw extension.

---

## 1. Conversation saved object (ES document)

> **Diagram:** [01_conversation_es_document.excalidraw](./agent_builder_option_b_diagrams/01_conversation_es_document.excalidraw)

```
Conversation (ES document)
├── id, agent_id, user, title, created_at, updated_at          ✅ existing
│
├── conversation_rounds[]  (PersistentConversationRound)        ✅ legacy — kept for single-user + rollback
│
├── ── B0 metadata ──────────────────────────────────────────────
│   ├── template_id?                                            ✅ persisted
│   ├── template_snapshot?   { template_id, profile,           ✅ type defined; written on create
│   │                          chat_mode, write_privileges }       (B2: full create-from-template flow ❌)
│   └── custom_fields?       Record<string, unknown>            ✅ persisted + PATCH API
│
├── ── B5 collaboration ─────────────────────────────────────────
│   ├── conversation_mode?   'single' | 'group'                 ✅ persisted (legacy; prefer chat_mode)
│   ├── chat_mode?           denorm from template_snapshot       ✅ persisted (list queries)
│   └── events[]             TimelineEvent[]                     ✅ canonical for collaborative convs
│       ├── UserMessageEvent   { id, timestamp, user, message }  ✅
│       └── AgentExecutionEvent { id, timestamp, agent_id, …}   ✅
│
├── ── B6 ITSM (not started) ────────────────────────────────────
│   ├── itsm?                { severity, status, external_refs } ❌ type exists; not in ES mapping
│   ├── workflow_ids?                                            ❌ type exists; not in ES mapping
│   └── connection_ids?                                         ❌ type exists; not in ES mapping
│
├── ── B4 Threads (not started) ─────────────────────────────────
│   ├── parent_conversation_id?                                  ❌
│   ├── child_conversation_ids[]                                 ❌
│   ├── thread_kind?         'containment'|'deep_dive'|…        ❌
│   └── fork?                { forked_at, fork_anchor_id, … }   ❌
│
└── ── N1/B3 Cases bridge (not started) ─────────────────────────
    └── attachments[]  →  CaseChatAttachment type               ❌ no case attachment type registered
```

---

## 2. Server-side components

> **Diagram:** [02_server_components.excalidraw](./agent_builder_option_b_diagrams/02_server_components.excalidraw)

```mermaid
flowchart TD
    subgraph routes ["Routes (server)"]
        R1["POST /conversations\n(create)  ✅"]
        R2["GET /conversations/:id\n✅"]
        R3["PATCH /conversations/:id\n(metadata)  ✅"]
        R4["POST /conversations/:id/messages\n(append, no agent)  ✅"]
        R5["POST /converse  ✅"]
        R6["POST /conversations/:parentId/threads\n❌ B4"]
    end

    subgraph conv_client ["ConversationClient"]
        CC1["get / list  ✅\n(ACL-filtered by chat_mode)"]
        CC2["create  ✅"]
        CC3["update  ✅"]
        CC4["conversation_access.ts\nhasReadAccess / hasWriteAccess  ✅\n(write = read, POC)"]
        CC5["converters.ts\nSO ↔ API  ✅"]
        CC6["storage.ts\nES mapping  ✅"]
    end

    subgraph exec ["Execution (execution_runner.ts)"]
        E1["isCollaborativeConversation?  ✅"]
        E2["shouldInvokeAgentForMessage?\n(@agent check)  ✅"]
        E3["appendHumanMessage$\n(collaborative_persistence.ts)  ✅"]
        E4["executeAgent\n(full agent pipeline)  ✅"]
        E5["trigger_hooks.ts\n(hook stub)  ✅"]
    end

    subgraph timeline ["Timeline converters"]
        T1["timeline_converters.ts\nroundsToTimelineEvents  ✅\n(legacy read compat)"]
    end

    subgraph missing_server ["Not started (server)"]
        MS1["CaseChatAttachment type\nregistration  ❌ N1"]
        MS2["itsm / workflow_ids\nin ES mapping  ❌ B6"]
        MS3["Threads API\nPOST …/threads  ❌ B4"]
        MS4["ConversationTemplate SO\nCRUD + privilege filter  ❌ B2"]
        MS5["Cases UserActions federation\nread into events[]  ❌ B3"]
    end

    R4 --> E3
    R5 --> E1
    E1 -->|collaborative + no @agent| E2
    E2 -->|false| E3
    E2 -->|true| E4
    E3 --> CC3
    E4 --> CC3
    CC1 --> CC4
    CC1 --> CC5
    CC6 --> CC5
```

---

## 3. Client-side components

> **Diagram:** [03_client_components.excalidraw](./agent_builder_option_b_diagrams/03_client_components.excalidraw)

```mermaid
flowchart TD
    subgraph shell ["Conversation detail shell  ✅ B1"]
        S1["ConversationDetailShell\n(2-column layout)  ✅"]
        S2["ConversationDetailHeader\n(title, template chip, actions)  ✅"]
        S3["ConversationDetailSidebar\n(custom_fields, assignees, agent)  ✅"]
        S4["Tabs: Activity / Attachments / Threads / Details  ✅"]
    end

    subgraph tabs ["Tab content"]
        T1["Activity tab\n= Conversation component\n(rounds[] / events[] feed)  ✅"]
        T2["Attachments tab\nConversationDetailAttachmentsTab  ✅"]
        T3["Threads tab\nPlaceholder  ✅\n(list + New thread  ❌ B4)"]
        T4["Details tab\nembedded context only  ✅"]
        T5["Knowledge tab\n❌ not built (B4+)"]
    end

    subgraph sidebar_detail ["Sidebar fields"]
        SD1["TemplateFieldRow\ncustom_fields PATCH  ✅"]
        SD2["TemplateAssigneesField\nassignees (metadata, not ACL)  ✅"]
        SD3["ConversationMembers\nmembers display  ✅"]
        SD4["ITSM fields\n(severity, status, Jira)  ❌ B6"]
        SD5["Workflow actions\n(Run playbook, Push to Jira)  ❌ B6"]
    end

    subgraph hooks_ui ["Hooks"]
        H1["useConversation  ✅"]
        H2["usePatchConversationMetadata  ✅"]
        H3["useSubmitMessage  ✅"]
        H4["useConversationStream  ✅"]
        H5["UI author labels\n(show user on each message)  🔄 B5.5"]
        H6["Group composer\n(@agent hint, shared badge)  🔄 B5.5"]
        H7["Realtime poll / SSE\non collaborative update  🔄 B5.5"]
    end

    subgraph gate ["Entry gate"]
        G1["isCollaborativeTemplateConversation()\n→ detail shell  ✅"]
        G2["else → flyout / chat only  ✅"]
    end

    G1 --> S1
    S1 --> S2 & S3 & S4
    S4 --> T1 & T2 & T3 & T4
    S3 --> SD1 & SD2 & SD3
```

---

## 4. Data flow: collaborative message append

> **Diagram:** [04_collaborative_message_flow.excalidraw](./agent_builder_option_b_diagrams/04_collaborative_message_flow.excalidraw)

```mermaid
sequenceDiagram
    actor A as Analyst A
    actor B as Analyst B
    participant UI as ConversationInput
    participant API as POST /messages ✅
    participant Runner as execution_runner ✅
    participant Hook as trigger_hooks ✅
    participant Persist as collaborative_persistence ✅
    participant ES as Elasticsearch

    A->>UI: types "seeing lateral movement"
    UI->>API: POST /conversations/:id/messages
    API->>Runner: isCollaborative? ✅
    Runner->>Hook: shouldInvokeAgentForMessage? → false
    Runner->>Persist: appendHumanMessage$
    Persist->>ES: append UserMessageEvent {user: A}
    ES-->>Persist: ack
    Persist-->>UI: UserMessageEvent response ✅

    B->>UI: opens same conversation (same space) ✅
    UI->>API: GET /conversations/:id
    API-->>UI: events[] with A's message + user ✅

    B->>UI: types "@agent summarize"
    UI->>API: POST /converse
    API->>Runner: isCollaborative? ✅
    Runner->>Hook: shouldInvokeAgentForMessage? → true ✅
    Runner->>ES: append UserMessageEvent {user: B}
    Runner->>Runner: executeAgent pipeline
    Runner->>ES: append AgentExecutionEvent ✅
```

---

## 5. What's missing by phase

> **Diagram:** [05_missing_by_phase.excalidraw](./agent_builder_option_b_diagrams/05_missing_by_phase.excalidraw)

| Phase | Component | Gap |
|-------|-----------|-----|
| **B5.5** | `ConversationRound` / Activity feed | Author label on each human message in feed |
| **B5.5** | `ConversationInput` | Group composer: `@agent` hint, "Shared investigation" badge |
| **B5.5** | `useConversation` / `useConversationStream` | Poll/SSE so Analyst B sees A's note without sending |
| **N1** | `attachments/contract.ts` | Register `case` attachment type + snapshot shape |
| **N1** | `ConversationDetailHeader` | Case chip in breadcrumb / header |
| **B2** | Server: `ConversationTemplate` SO | Template registry, CRUD, privilege filter |
| **B2** | UI: create-from-template picker | Template picker filtered by role |
| **B2.1** | `conversation_access.ts` | Enforce `write_privileges` (currently write = read) |
| **B3** | `ConversationClient` | Federate Cases UserActions into `events[]` when case attached |
| **B4** | `Conversation` SO | `parent_conversation_id`, `child_conversation_ids[]`, `fork` fields |
| **B4** | Routes | `POST /conversations/:parentId/threads` |
| **B4** | Threads tab | List children + "Start thread from here" |
| **B6** | `Conversation` SO | `itsm`, `workflow_ids`, `connection_ids` in ES mapping |
| **B6** | Sidebar | ITSM fields, "Push to Jira" / "Run playbook" wired to workflows |
| **B6** | `trigger_hooks.ts` | `conversation.thread.created` etc. workflow event dispatch |
