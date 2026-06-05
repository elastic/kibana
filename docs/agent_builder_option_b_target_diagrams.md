# Option B — Target Architecture Diagrams

Conceptual diagrams for the **Conversation as Case** north star. These show the intended design independent of implementation status.

**Excalidraw diagrams:** [agent_builder_option_b_target_diagrams/](./agent_builder_option_b_target_diagrams/) — open `.excalidraw` files in [Excalidraw](https://excalidraw.com) or VS Code with the Excalidraw extension.

---

## 1. Product concept: what changes

> **Diagram:** [01_product_concept.excalidraw](./agent_builder_option_b_target_diagrams/01_product_concept.excalidraw)

The core shift is moving the investigation record from the Cases saved object to the Conversation.

```mermaid
flowchart LR
    subgraph today ["Today"]
        direction TB
        C1["Kibana Case\n────────────\nActivity log\nAssignees\nCustom fields\nConnectors (Jira…)\nTemplate"]
        C2["AB Conversation\n────────────\nChat rounds\nAttachments\nSingle user"]
        C1 -. "analyst switches\nbetween two tools" .-> C2
    end

    subgraph optionB ["Option B — target"]
        direction TB
        INV["Conversation (Investigation)\n────────────────────────────\nActivity  ← events[] + rounds[]\nAttachments  ← alerts, rules, case chip\nCustom fields  ← template-driven\nAssignees  ← metadata\nWorkflows / Jira  ← ITSM\nThreads  ← child Conversations\nKnowledge\n@agent in shared timeline"]
        CASE["Kibana Case (ITSM bridge)\n────────────────────────────\nSurvives as audit record\nLinked via case attachment"]
        INV -- "case attachment" --> CASE
    end

    today -- "Option B migration" --> optionB
```

---

## 2. Conversation data model — before and after

> **Diagram:** [02_data_model_before_after.excalidraw](./agent_builder_option_b_target_diagrams/02_data_model_before_after.excalidraw)

How the `Conversation` type grows from a single-user chat container into a full investigation record.

```mermaid
classDiagram
    class Conversation_before ["Conversation (before — main)"] {
        +id: string
        +agent_id: string
        +user: UserIdAndName
        +title: string
        +created_at: string
        +updated_at: string
        +rounds: ConversationRound[]
        +attachments?: VersionedAttachment[]
        +state?: ConversationInternalState
        +read?: boolean
        +status?: ConversationRoundStatus
    }

    class ConversationRound_before ["ConversationRound (before)"] {
        +id: string
        +status: ConversationRoundStatus
        +input: RoundInput
        +steps: ConversationRoundStep[]
        +response: AssistantResponse
        +started_at: string
        +time_to_first_token: number
        +time_to_last_token: number
        +model_usage: RoundModelUsageStats
        +state?: RoundState
        +trace_id?: string
    }

    class VersionedAttachment_before ["VersionedAttachment (before)"] {
        +type: alert | rule | esql | …
        +id: string
        +version: number
        +data: unknown
    }

    Conversation_before --> ConversationRound_before : rounds[]
    Conversation_before --> VersionedAttachment_before : attachments[]
```

```mermaid
classDiagram
    class Conversation_after ["Conversation (after — Option B)"] {
        +id: string
        +agent_id: string
        +user: UserIdAndName
        +title: string
        +created_at: string
        +updated_at: string
        +rounds: ConversationRound[]
        +attachments?: VersionedAttachment[]
        +state?: ConversationInternalState
        +read?: boolean
        +status?: ConversationRoundStatus
        ──── B0 investigation metadata ────
        +template_id?: string
        +template_snapshot?: TemplateSnapshot
        +custom_fields?: Record~string,unknown~
        +assignees?: UserIdAndName[]
        +labels?: string[]
        ──── B5 collaborative timeline ────
        +conversation_mode?: single|group
        +events?: TimelineEvent[]
        ──── B4 threading ────
        +parent_conversation_id?: string
        +child_conversation_ids?: string[]
        +thread_kind?: ThreadKind
        +fork?: ForkMetadata
        ──── B6 ITSM ────
        +itsm?: Itsm
        +workflow_ids?: string[]
        +connection_ids?: string[]
    }

    class AgentExecution ["AgentExecution (new shared base)"] {
        +status: ConversationRoundStatus
        +steps: ConversationRoundStep[]
        +response: AssistantResponse
        +started_at: string
        +time_to_first_token: number
        +time_to_last_token: number
        +model_usage: RoundModelUsageStats
        +state?: RoundState
        +trace_id?: string
    }

    class ConversationRound_after ["ConversationRound (after)"] {
        +id: string
        +input: RoundInput
        ··extends AgentExecution··
    }

    class AgentExecutionEvent ["AgentExecutionEvent (new)"] {
        +id: string
        +type: agent_execution
        +timestamp: string
        +agent_id: string
        ··extends AgentExecution··
    }

    class UserMessageEvent ["UserMessageEvent (new)"] {
        +id: string
        +type: user_message
        +timestamp: string
        +user: UserIdAndName
        +message: string
        +attachment_refs?: AttachmentVersionRef[]
    }

    class TimelineEvent ["TimelineEvent (new union)"] {
        <<union>>
    }

    class TemplateSnapshot ["TemplateSnapshot (new)"] {
        +template_id: string
        +profile: string
        +chat_mode: single|collaborative
        +write_privileges?: string[]
        +captured_at: string
    }

    class Itsm ["Itsm (new)"] {
        +severity?: string
        +status?: string
        +external_refs?: ExternalRef[]
    }

    class CaseChatAttachment ["CaseChatAttachment (new attachment type)"] {
        +type: case
        +case_id: string
        +owner: string
        +snapshot: CaseSnapshot
    }

    AgentExecution <|-- ConversationRound_after : extends
    AgentExecution <|-- AgentExecutionEvent : extends
    TimelineEvent <|-- UserMessageEvent : union member
    TimelineEvent <|-- AgentExecutionEvent : union member

    Conversation_after --> ConversationRound_after : rounds[]
    Conversation_after --> TimelineEvent : events[]
    Conversation_after --> TemplateSnapshot : template_snapshot
    Conversation_after --> Itsm : itsm
    Conversation_after --> CaseChatAttachment : attachments[] (new type)
    Conversation_after --> Conversation_after : child threads
```

---

## 3. Conversation data model — target

> **Diagram:** [03_data_model.excalidraw](./agent_builder_option_b_target_diagrams/03_data_model.excalidraw)

```mermaid
classDiagram
    class Conversation {
        +id: string
        +agent_id: string
        +user: UserIdAndName
        +title: string
        +created_at: string
        +updated_at: string
        ---
        +template_id?: string
        +template_snapshot?: TemplateSnapshot
        +custom_fields?: Record~string,unknown~
        +assignees?: UserIdAndName[]
        +labels?: string[]
        ---
        +events?: TimelineEvent[]
        +rounds: ConversationRound[]
        +attachments?: VersionedAttachment[]
        ---
        +parent_conversation_id?: string
        +child_conversation_ids?: string[]
        +thread_kind?: ThreadKind
        +fork?: ForkMetadata
        ---
        +itsm?: Itsm
        +workflow_ids?: string[]
        +connection_ids?: string[]
        +conversation_mode?: ConversationMode
    }

    class TemplateSnapshot {
        +template_id: string
        +profile: string
        +chat_mode: single | collaborative
        +write_privileges?: string[]
        +captured_at: string
    }

    class TimelineEvent {
        <<union>>
        UserMessageEvent
        AgentExecutionEvent
    }

    class UserMessageEvent {
        +id: string
        +type: user_message
        +timestamp: string
        +user: UserIdAndName
        +message: string
        +attachment_refs?: AttachmentVersionRef[]
    }

    class AgentExecutionEvent {
        +id: string
        +type: agent_execution
        +timestamp: string
        +agent_id: string
        +steps: ConversationRoundStep[]
        +response: AssistantResponse
    }

    class ConversationTemplate {
        +id: string
        +profile: TemplateProfile
        +field_definitions: TemplateField[]
        +chat_mode: single | collaborative
        +required_privileges?: string[]
        +write_privileges?: string[]
        +defaults?: TemplateDefaults
    }

    class Itsm {
        +severity?: string
        +status?: string
        +external_refs?: ExternalRef[]
    }

    class CaseChatAttachment {
        +type: case
        +case_id: string
        +owner: string
        +snapshot: CaseSnapshot
    }

    Conversation --> TemplateSnapshot : template_snapshot
    Conversation --> TimelineEvent : events[]
    Conversation --> Itsm : itsm
    Conversation --> CaseChatAttachment : attachments[]
    Conversation --> Conversation : child threads
    TimelineEvent <|-- UserMessageEvent
    TimelineEvent <|-- AgentExecutionEvent
    ConversationTemplate --> Conversation : create-from-template
```

---

## 4. Activity feed — unified timeline

> **Diagram:** [04_activity_feed.excalidraw](./agent_builder_option_b_target_diagrams/04_activity_feed.excalidraw)

The Activity tab merges two sources into one chronological feed. Each entry type has a distinct visual treatment.

```mermaid
flowchart LR
    subgraph sources ["Sources on Conversation"]
        EV["events[]\n──────────────\nUserMessageEvent\n(human comments)\nWorkflow events\nSystem events\nCases UserActions\n(B3 federated)\nthread_created rollup"]
        RD["rounds[]\n──────────────\nConversationRound\n(agent turns,\ntool calls,\nresponses)"]
    end

    MERGE["merge + sort by timestamp"]

    subgraph feed ["Activity feed (UI)"]
        direction TB
        F1["👤 Analyst A · 2m ago\n&quot;seeing lateral movement on SRVWIN04&quot;"]
        F2["🤖 @agent · 2m ago  AI response\nInitial assessment: Mimikatz dump at 14:02…"]
        F3["👤 Analyst B · 5m ago\nadded attachment: alert-89a4f2 …"]
        F4["⚙️ Workflow · 11m ago\non-critical-case-created → created JIRA-4821"]
        F5["🔴 System · 14m ago\nseverity changed to critical"]
        F6["📋 System · 16m ago\nTemplate applied: incident-triage-v2"]
    end

    EV --> MERGE
    RD --> MERGE
    MERGE --> F1 & F2 & F3 & F4 & F5 & F6
```

---

## 5. Conversation detail UX layout

> **Diagram:** [05_ux_layout.excalidraw](./agent_builder_option_b_target_diagrams/05_ux_layout.excalidraw)

```mermaid
flowchart TB
    subgraph page ["Conversation detail page"]
        direction TB

        subgraph header ["Header"]
            H["🔴  Ransomware kill chain on SRVWIN04\n                              [ Run playbook ]  [ Push to Jira ]"]
        end

        subgraph body ["Body"]
            direction LR

            subgraph main ["Main  (flex: 1)"]
                TABS["[ Activity ]  [ Attachments 12 ]  [ Threads ]  [ Knowledge ]"]
                subgraph activity ["Activity tab"]
                    FEED["Unified timeline\n(events[] + rounds[])\n────────────────────\nAI responses\nHuman comments\nSystem events\nWorkflow events\n────────────────────\n[ @assistant ]  [ @analyst ]  [ + next steps ]  [ ▶ status ]\n[ Add a comment, @mention, or @assistant… ]  [ Send ]"]
                end
                TABS --> activity
            end

            subgraph sidebar ["Sidebar  (320px)"]
                direction TB
                CF["CUSTOM FIELDS\n────────────────\nSeverity    critical\nStatus      in progress\nMITRE       T1486, T1021.002\nAffected    SRVWIN04"]
                AS["Assignees\n────────────────\n[ DC ]  [ KK ]  [ + ]"]
                EX["EXTERNAL\n────────────────\n↗ JIRA-4821\nsynced 11m ago"]
                AG["AGENT\n────────────────\n✦ aria-soc-analyst\ntrigger: @mention"]
                WF["WORKFLOWS\n────────────────\non-critical-case-created\nransomware-containment\n[ + Link workflow ]"]
                CF --- AS --- EX --- AG --- WF
            end
        end

        header --- body
    end
```

---

## 5.1 ITSM at a glance (B6)

> **Diagram:** [09_itsm_at_a_glance.excalidraw](./agent_builder_option_b_target_diagrams/09_itsm_at_a_glance.excalidraw)

One-page view of how ITSM works in Option B: the **Conversation** is where analysts work; **Workflows** handle automation; **Case** is an optional audit bridge.

```mermaid
flowchart TB
    subgraph work ["Where analysts work"]
        CONV["Conversation\n(investigation record)"]
        CONV --- META["custom_fields · assignees"]
        CONV --- ITSM["itsm\nseverity · status · external_refs"]
        CONV --- WFIDS["workflow_ids · connection_ids"]
        CONV --- ACT["Activity timeline\nevents[] + rounds[]"]
    end

    subgraph automate ["Automation (B6)"]
        WFP["Workflows platform\nconversation.* triggers"]
        CONN["Connectors v2\n(e.g. Jira)"]
        WFP -->|"Run playbook"| CONV
        WFP -->|"Push to Jira"| CONN
        CONN -->|"JIRA-4821"| ITSM
    end

    subgraph bridge ["Optional bridge (N1 + B3)"]
        CASE["Kibana Case\n(audit record)"]
        CONV <-->|"case attachment"| CASE
        ACT <-->|"read UserActions · mirror key events"| CASE
    end

    ANALYST["Analyst"] -->|"investigate, chat, @agent"| CONV
    ANALYST -->|"Run playbook · Push to Jira"| WFP
```

**Takeaway:** ITSM moves onto the Conversation. Case stays for compliance and legacy Security workflows — linked, not replaced.

---

## 6. Access control layers

> **Diagram:** [06_access_control.excalidraw](./agent_builder_option_b_target_diagrams/06_access_control.excalidraw)

```mermaid
flowchart TB
    subgraph L1 ["Layer 1 — Kibana privileges"]
        P1["use_incident_investigation_template\n→ can see & create incident investigations"]
        P2["write_incident_investigation\n→ can append messages & invoke @agent"]
    end

    subgraph L2 ["Layer 2 — Kibana Space"]
        SP["Analysts in same space = same team\nCollaborative conversations filtered by space_id"]
    end

    subgraph L3 ["Layer 3 — Conversation record"]
        CM["template_snapshot.chat_mode\n────────────────────────────\ncollaborative → team-visible in space\nsingle        → creator only"]
        AUTH["Authorship: UserMessageEvent.user\n(who said what — not an ACL list)"]
    end

    L1 --> L2 --> L3

    subgraph decisions ["Access decisions"]
        D1["List investigations\n= space + chat_mode:collaborative\n  OR owner"]
        D2["Read investigation\n= same as list"]
        D3["Append / @agent\n= space + write privilege\n  OR owner (single)"]
        D4["Delete\n= creator only (POC)"]
    end

    L3 --> decisions
```

---

## 7. Threads — parallel workstreams

> **Diagram:** [07_threads.excalidraw](./agent_builder_option_b_target_diagrams/07_threads.excalidraw)

```mermaid
flowchart TB
    subgraph parent ["Parent Conversation  (main investigation)"]
        PA["Activity\n────────────────────────────────\nUserMessageEvent { user: Lead }\nAgentExecutionEvent\nthread_created  → Containment thread\nthread_created  → Deep dive thread\nUserMessageEvent { user: Analyst B }"]
        PS["Sidebar\n────────────────────────────────\nSeverity: critical\nMITRE: T1486\ncase chip: CASE-4821"]
        PT["[ Activity ]  [ Attachments ]  [ Threads 2 ]  [ Knowledge ]"]
    end

    subgraph t1 ["Thread: Containment  (child Conversation)"]
        T1A["Activity\n────────────────────────────────\nInherits template_snapshot\ncustom_fields snapshot at create\nsame case_id attachment\nown events[] + rounds[]"]
        T1B["← back to parent"]
    end

    subgraph t2 ["Thread: Deep dive  (child Conversation)"]
        T2A["Activity\n────────────────────────────────\nOptional history prefix\n(fork_anchor_id)"]
        T2B["← back to parent"]
    end

    parent -- "fork (copy-on-create)\nPOST /conversations/:id/threads" --> t1
    parent -- "fork (copy-on-create)\nPOST /conversations/:id/threads" --> t2
```

---

## 8. Phased delivery — capability roadmap

> **Diagram:** [08_phased_delivery.excalidraw](./agent_builder_option_b_target_diagrams/08_phased_delivery.excalidraw)

```mermaid
timeline
    title Option B capability delivery

    section Done
        B0  : Conversation metadata
            : template_id, custom_fields
            : template_snapshot type
        B5.1–B5.4 : Multi-user chat foundation
            : events[] canonical in ES
            : space + chat_mode ACL
            : POST /messages (append, no agent)
            : @agent trigger hook in execution_runner
        B1  : Conversation detail shell
            : 2-column layout
            : Activity / Attachments / Threads tabs
            : Sidebar with custom_fields + assignees

    section In progress
        B5.5 : UX for collaborative chat
             : Author labels on messages
             : Group composer (@agent hint)
             : Realtime refresh / poll

    section Next
        N1  : Cases bridge
            : case attachment type
            : Case → Start investigation flow
            : Case chip in header
        B2  : Templates
            : ConversationTemplate SO
            : Create-from-template UI
            : Privilege enforcement (write_privileges)

    section Later
        B3  : Cases federation
            : Read UserActions into events[]
            : Mirror key events to Case
        B4  : Threads
            : parent/child Conversation fields
            : POST /threads API
            : Threads tab + New thread UI
        B6  : ITSM + Workflows
            : itsm fields in ES
            : Push to Jira sidebar action
            : conversation.* workflow triggers
```
