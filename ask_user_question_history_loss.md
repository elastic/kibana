# Agent Builder: `ask_user_question` answers are dropped on round resume

Verified against conversation `d0ea33d7-e3a9-40a7-947d-bd1ca18ed8ad` (space `ss`)
and Phoenix project `jatink` on 2026-08-17.

## Summary

When a round ends in `ask_user_question`, the user's answer resumes the **same
round** (status stays `awaiting_prompt`). On each resume, the prompt sent to the
LLM is rebuilt via `buildPendingRoundActions`, which replays regular tool calls
and only the **currently pending** question + fresh answer. Every *previously
answered* `ask_user_question` step is silently dropped — even though the ES
document (`.chat-conversations`) retains all of them. Each answer is visible to
the model for exactly one turn, then forgotten, so the agent loops re-asking
questions the user already answered.

Evidence: LLM input message counts per turn were 3 → 11 (turn 1), 13 → 15
(turn 2), then frozen at **15, 15** for turns 3 and 4, while the stored round
grew to 17 steps with 4 `ask_user_question` entries.

## Workflow

```mermaid
flowchart TD
    subgraph T1["Turn 1 — 12:51:51 (trace e2f359a8)"]
        A1["User: 'Start My Sentinel Migration'"]
        A2["LLM prompt: system + user msg + tool flow<br/>(load_skill, migration stats, missing resources, connectors)<br/>grows 3 to 11 messages"]
        A3["Agent asks Q1:<br/>'How to proceed with missing Watchlists?'"]
        A1 --> A2 --> A3
    end

    subgraph T2["Turn 2 — 12:52:30 (trace ea1f636d)"]
        B1["User answers Q1: 'Start now'"]
        B2["LLM prompt: 13 to 15 messages<br/>= tool flow + Q1 + A1 (pending Q&A is replayed)"]
        B3["Agent asks Q2:<br/>'Which AI connector? Skip prebuilt rules?'"]
        B1 --> B2 --> B3
    end

    subgraph T3["Turn 3 — 12:54:15 (trace 8f8f3837)"]
        C1["User answers Q2: 'Sonnet 4.6' / 'No'"]
        C2["LLM prompt: 15 messages<br/>= tool flow + Q2 + A2<br/>STRIPPED: Q1 + A1 (watchlists answer gone)"]
        C3["Agent re-asks Q1 as Q3:<br/>'2 Watchlists missing. How to proceed?'<br/>(no longer knows user said 'Start now')"]
        C1 --> C2 --> C3
    end

    subgraph T4["Turn 4 — 12:54:42 (trace 41143435)"]
        D1["User answers Q3: 'I already gave all answers..'"]
        D2["LLM prompt: 15 messages<br/>= tool flow + Q3 + A3<br/>STRIPPED: Q1+A1 AND Q2+A2<br/>(connector choice gone too)"]
        D3["Agent re-asks Q2 as Q4:<br/>'Which connector? Skip prebuilt?'<br/>and says 'this is the first time I'm asking'"]
        D1 --> D2 --> D3
    end

    T1 --> T2 --> T3 --> T4

    subgraph ES["ES doc .chat-conversations (source of truth)"]
        E1["Round 1, status: awaiting_prompt<br/>ALL steps retained:<br/>Q1+A1, Q2+A2, Q3+A3, Q4 pending<br/>Nothing is lost in storage"]
    end

    T4 -.->|"persisted correctly"| ES
```

## Root cause

Files (under
`x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/utils/`):

- `to_langchain_messages.ts` — `convertPreviousRounds` slices off the
  `awaiting_prompt` round (lines ~94-101) and delegates its reconstruction to
  the resume path. Note: for **completed** rounds, `roundToLangchain`
  (lines ~184-197) correctly renders answered questions as
  tool-call/tool-result pairs.
- `round_to_actions.ts` — `roundToActions` only replays tool-call steps
  (`groupToolCallSteps` filters `isToolCallStep`), so `ask_user_question`
  steps are invisible to it.
- `pending_ask_user_question_steps_to_actions.ts` — only replays steps with
  `answers === undefined` (the pending one) plus the incoming response.

Answered `ask_user_question` steps match **neither** filter and are dropped
from the rebuilt prompt.

## Fix direction

Make the resume path mirror the completed-round renderer: in
`roundToActions` (or `buildPendingRoundActions`), emit
tool-call/execute-tool action pairs for answered `ask_user_question` steps,
in step order, reusing `materializeAskUserQuestionToolCall`.
