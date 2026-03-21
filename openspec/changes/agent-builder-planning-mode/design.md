## Context

The agent builder plugin executes agents through a single code path: `runAgent()` in `modes/run_agent.ts` delegates directly to `runDefaultAgentMode()`. The default mode uses a multi-step LangGraph: an **init** step, a **research agent** (with tools) that reasons and calls tools, **tool execution**, **prepare to answer**, an **answer agent** that synthesizes the final response, and a **finalize** step. System instructions are composed dynamically via `createPromptFactory()` based on agent configuration and experimental features.

Key architecture points relevant to planning mode:

- **File paths**: The plugin lives at `x-pack/platform/plugins/shared/agent_builder/`. Common types are in `x-pack/platform/packages/shared/agent-builder/agent-builder-common/`. Server types are in `x-pack/platform/packages/shared/agent-builder/agent-builder-server/`. The plugin's own common types (like `ChatRequestBodyPayload`) are in `x-pack/platform/plugins/shared/agent_builder/common/`.
- **Modes directory**: `server/services/agents/modes/default/` contains the default agent mode. The `modes/run_agent.ts` entry point is a natural dispatch point for adding new modes.
- **Experimental features**: Gated via `agentBuilder:experimentalFeatures` UI setting, parsed into `ExperimentalFeatures` (`{ filestore: boolean, skills: boolean }`) in `server/services/runner/run_agent.ts`. Instructions and behavior are conditionally enabled based on these flags.
- **Task Manager execution**: Agent execution now flows through an execution service (`server/services/execution/execution_service.ts`) that decides between local and Task Manager execution. The TM path serializes `AgentExecutionParams` into an ES document, schedules a task, and the task handler deserializes and runs `handleAgentExecution()`. Any new parameter (like `agent_mode`) must be part of `AgentExecutionParams` to survive this hop.
- **Streaming events**: The `ChatEventType` enum in `@kbn/agent-builder-common` defines all event types. Events flow from the agent runner → tool handlers / `AgentEventEmitter` → graph events → `convertGraphEvents` → SSE stream → client `ChatService` → `useSubscribeToChatEvents` hook → UI components.
- **Conversation state**: `ConversationInternalState` holds `prompt` state and `dynamic_tool_ids`. It is persisted with the conversation and restored on continuation. The `getConversationState()` callback in `run_chat_agent.ts` serializes this state into `RoundCompleteEvent`.
- **Converse API**: `ChatRequestBodyPayload` (in `agent_builder/common/http_api/chat.ts`) defines the request body. The validation schema (`conversePayloadSchema`) is in `server/routes/chat.ts`.
- **UI thinking panel**: `RoundThinking` / `RoundThinkingPanel` display tool calls and reasoning steps in a collapsible panel.
- **Built-in tools**: Static tools are registered through the plugin setup contract (`agentBuilder.tools.register()`). They implement `BuiltinToolDefinition` with `availability.handler` receiving `ToolAvailabilityContext` (`{ request, uiSettings, spaceId }` — note: this context does NOT include `agentMode` or `experimentalFeatures`). Conditional tool inclusion is handled in `selectTools()`, which already conditionally includes filestore tools based on `experimentalFeatures.filestore`.
- **Tool availability vs tool selection**: `ToolAvailabilityContext` is for static availability checks (feature flags, RBAC). Mode-dependent tool inclusion must use the `selectTools()` pattern (same as filestore tools), not `isAvailable`.
- **Tool event emission**: Tools do not have direct access to `AgentEventEmitter`. They receive `ToolHandlerContext.events` (a `ToolEventEmitter` with `reportProgress` and `sendUiEvent`). The event pipeline flows: tool handler → `onEvent` callback → `sendEvent` (the `AgentEventEmitterFn`) → `manualEvents$` subject → merged into `events$` stream. Planning tools that need to emit custom events (`plan_created`, `plan_updated`, `mode_suggestion`) must use a **factory pattern** (closure over `manualEvents$`), matching the `getStoreTools({ filestore })` pattern.
- **Client experimental features**: The `agentBuilder:experimentalFeatures` UI setting is currently only read server-side (`server/services/runner/run_agent.ts`). The client (`public/`) does not expose this setting. A new `useExperimentalFeatures()` hook or context extension is needed to make it available for conditional rendering.
- **Event type guards**: `useSubscribeToChatEvents` uses type guard functions (`isMessageChunkEvent`, `isToolCallEvent`, etc.) in an if-else chain. New event types need corresponding type guards (`isPlanCreatedEvent`, `isPlanUpdatedEvent`, `isModeSuggestionEvent`).
- **Conversation layout**: The current `Conversation` component uses a vertical `EuiFlexGroup` (column direction) with `ConversationRounds` and `ConversationInput`. Adding a sidebar requires wrapping this in a horizontal (row) flex container.
- **Message editor API**: Pre-filling messages uses `messageEditor.setContent(text)` followed by `messageEditor.focus()`, obtained from `useMessageEditor()` in `ConversationInput`.

## Goals / Non-Goals

**Goals:**
- Users can select planning mode or agent mode for a conversation round from the chat UI
- The converse API accepts an `agent_mode` parameter to select the mode
- In planning mode, the agent creates a structured plan using `create_plan` and refines it using `update_plan`, but does NOT execute the plan
- The agent can ask the user follow-up questions during planning to clarify requirements
- When the plan is finalized, the user approves it via an explicit "Approve & Execute" button or by manually toggling the mode selector
- In agent mode with an existing plan, the agent executes the plan steps, updating progress via `update_plan`
- When the user asks a complex question in agent mode, the agent can call `suggest_planning_mode` tool to emit a `mode_suggestion` event that shows a quick-action button in the UI
- If the user declines the planning mode suggestion (or is already in agent mode), the agent can self-plan: create a plan that does not require approval and immediately begin executing it
- The plan is displayed in a collapsible right sidebar panel that can be viewed alongside the conversation
- Users can click plan items to pre-fill the chat input with a reference to that step for targeted feedback
- Plan items have granular status (`pending` | `in_progress` | `completed` | `failed`) for richer progress visualization
- Plan state is persisted in `ConversationInternalState` so it survives across rounds
- The `agent_mode` parameter is threaded through the Task Manager execution path
- Dedicated streaming events allow real-time plan updates in the UI
- The entire feature is gated behind the existing experimental feature flag

**Non-Goals:**
- No user-editable plans (the plan is agent-controlled; users can ask the agent to modify it via natural language)
- No plan templates or pre-built plan structures
- No plan export, sharing, or persistence beyond the conversation
- No `reason_on_plan` synthetic reasoning tool (out of scope for this issue; may be added later)
- No multi-plan support per conversation (one active plan at a time)
- No partial plan execution (user can't select which items to execute — the agent works through all of them)

## Decisions

### 1. Two modes: `planning` and `agent`

**Decision**: The two modes are `planning` (plan creation/refinement) and `agent` (execution). The current default behavior is the `agent` mode.

**Rationale**: The naming makes the user intent clear. `planning` = "help me make a plan", `agent` = "go do things". The existing behavior (research → answer with tools) maps cleanly to `agent` mode. When no plan exists, `agent` mode behaves identically to the current default. When a plan exists, `agent` mode gains plan-aware instructions and the `update_plan` tool.

### 2. Agent mode as a per-round parameter (not a conversation property)

**Decision**: The `agent_mode` is sent with each converse request, not stored permanently on the conversation.

**Rationale**: This gives users flexibility to switch modes between rounds. A user starts in planning mode to build a plan, then transitions to agent mode for execution. The mode affects how the agent behaves during a single execution round (which tools are available, which instructions are active), not the conversation's identity. The plan itself persists in `ConversationInternalState` regardless of the active mode.

### 3. Plan stored in ConversationInternalState (not as an attachment)

**Decision**: Store the plan as a `plan?: Plan` field on `ConversationInternalState`.

**Rationale**: The issue considered two approaches — conversation state or attachments. We choose conversation state because:
- The plan needs to be **updated in place** across rounds (action items get marked complete), which aligns with mutable state, not immutable attachment snapshots
- The plan must be **sticky** in the UI (displayed persistently, not inline in the message stream), which attachments don't currently support
- The plan is conceptually **agent-internal state** (like prompt responses and dynamic tool IDs), not user-provided input
- `ConversationInternalState` already has a pattern for cross-round persistence via `getConversationState()` → `RoundCompleteEvent` → conversation persistence

The plan is exposed to the UI via dedicated streaming events (`plan_created`, `plan_updated`), not by reading conversation state directly.

**Trade-off**: This means the plan is not visible as an attachment in the conversation history. If attachment-based display becomes desirable later, we can add a derived "plan attachment" view without changing the underlying storage.

### 4. Plan approval flow: explicit button, no auto-switch on chat reply

**Decision**: The user approves the plan via an explicit "Approve & Execute" button in the plan panel or by manually toggling the mode selector. **There is no auto-mode-switch when the user replies in chat.** Replying in planning mode always stays in planning mode.

**Rationale**: Auto-switching on chat reply (the previous design) was the riskiest UX decision. If the user types "Can you explain step 2 more?" with a ready plan, they'd accidentally trigger execution. The mitigations (toast notification, "agent can interpret the message") were weak. By removing auto-switch:
- Users never accidentally trigger execution
- The "Approve & Execute" button is a clear, intentional gesture
- Users can discuss a `ready` plan without fear of triggering execution
- The mode toggle remains as a power-user option
- The interaction model is simpler and more predictable

The approval transitions can happen two ways:
1. **User clicks "Approve & Execute"** in the plan panel. The UI switches to agent mode and pre-fills the message editor with "Execute the plan." (user can customize before sending).
2. **User manually toggles the mode selector** from planning → agent. If a plan with status `ready` exists, the UI pre-fills the message editor with "Execute the plan."

### 5. Plan lifecycle status and source tracking

**Decision**: The plan has a `status` field (`'draft'` or `'ready'`) and a `source` field (`'planning'` or `'agent'`).

```typescript
type PlanStatus = 'draft' | 'ready';
type PlanSource = 'planning' | 'agent';

interface Plan {
  title: string;
  description?: string;
  action_items: PlanActionItem[];
  status: PlanStatus;
  source: PlanSource;
}
```

**Rationale**: The `source` tracks who initiated the plan, which determines the approval flow:

- **`source: 'planning'`** (user explicitly entered planning mode): Full approval flow. The `status` drives the UX:
  - `draft`: Plan is still being refined. No "Execute" button. User reply stays in planning mode.
  - `ready`: Plan is finalized. "Approve & Execute" button shown. User reply stays in planning mode (no auto-switch).

- **`source: 'agent'`** (agent self-planned in agent mode): No approval required. The plan is created with `status: 'ready'` and the agent immediately proceeds to execute it. The plan panel shows the plan for visibility/progress tracking, but no approval gate.

The `status` transition from `draft` → `ready` is controlled by the agent via `update_plan` (which accepts an optional `status` field). In planning mode, the instructions tell the agent to set the status to `ready` when it has no more questions. In agent mode, `create_plan` automatically sets `status: 'ready'` (since no approval is needed).

### 6. Planning mode behavior: plan-only with read-only skill/tool discovery

**Decision**: In planning mode, the agent has `create_plan` and `update_plan` tools, plus **read-only access to skill content and tool metadata**. The agent does NOT have access to execution tools (search, ES|QL, MCP, etc.). The agent's instructions explicitly state it should only plan, not execute.

**Rationale**: This enforces the approval boundary while allowing the agent to build informed plans. The user must transition to agent mode before the agent can take action. In planning mode, the agent:
- **Reads skill content** from the skills filesystem (via the existing `MemoryVolume` / `VirtualFileSystem`) to understand available capabilities and domain knowledge
- **Inspects tool descriptions** via `list_available_tools` to determine which tools are relevant for each plan step
- Creates the plan (annotating each item with relevant skills/tools)
- Asks clarifying questions
- Refines the plan based on user feedback
- Marks the plan as `ready` when satisfied
- Does NOT call execution tools (search, ES|QL, MCP, etc.)

The research → answer graph still runs in planning mode, but the research agent's tool set is restricted. Planning tools are selected via a dedicated `selectPlanningTools()` function (following the same pattern as filestore tools in `selectTools()`), NOT through `ToolAvailabilityContext.isAvailable()` which doesn't carry mode information.

**Why skill access matters**: Skills contain domain-specific instructions, referenced content, and tool bindings. By reading skill content during planning, the agent can:
- Understand which skills are relevant to the user's request
- Identify the tools each skill brings
- Annotate plan items with the specific skills/tools they'll need
- Build more accurate plans that map to the agent's actual capabilities

### 7. Agent mode with plan awareness

**Decision**: When `agent` mode is selected and a plan exists in `ConversationInternalState`, the agent receives plan-aware system instructions and the `update_plan` tool.

**Rationale**: This is how plan execution works. The agent mode handler checks for an existing plan and, if found:
- Injects the plan into the system prompt (showing all items and their status)
- Adds instructions: "Execute the plan step by step. After completing each step, use `update_plan` to mark it done. Move to the next incomplete item."
- Makes `update_plan` available (alongside all regular tools)
- The plan context helps the agent stay focused and track progress

When no plan exists, agent mode behaves identically to the current default behavior — no plan instructions, no `update_plan` tool.

### 8. Planning mode as a forked variation of the default mode

**Decision**: The planning mode handler (`runPlanningAgentMode`) reuses the graph building blocks from the default mode (`createAgentGraph`, `convertGraphEvents`, `addRoundCompleteEvent`, `extractRound`) but has its **own tool selection and prompt factory**.

**Rationale**: The previous design said "wraps the default mode." But `runDefaultAgentMode` is a 260-line function with tightly coupled tool selection, prompt creation, and graph construction. Wrapping it would require exposing many internal hooks. Instead, `runPlanningAgentMode`:
- Imports and reuses: `createAgentGraph`, `convertGraphEvents`, `addRoundCompleteEvent`, `extractRound`, `prepareConversation`, `getPendingRound`
- Has its own: `selectPlanningTools()` (planning tools + optional filestore tools), `createPlanningPromptFactory()` (planning-specific system instructions)
- Shares the same graph structure (init → research → answer) since planning still benefits from the research → answer pattern

This avoids tight coupling while reusing the actual building blocks. It also means planning mode prompts don't interfere with the default mode's prompt composition.

Implementation:
```
runAgent(params, context)
  └─ if mode === 'planning' → runPlanningAgentMode(params, context)
     └─ selectPlanningTools(): create_plan + update_plan + list_available_tools
     └─ mounts skills filesystem (read-only, via createStore)
     └─ createPlanningPromptFactory(): planning system instructions
     └─ createAgentGraph() with planning tools + prompts
  └─ if mode === 'agent' → runDefaultAgentMode(params, context)
     └─ selectTools() + conditionally add create_plan, update_plan, suggest_planning_mode
     └─ if plan exists: inject plan context + plan execution instructions via promptFactory
     └─ createAgentGraph() with full tools + prompts
```

### 9. Plan data structure with granular action item status

**Decision**: A plan consists of a `title`, optional `description`, ordered `action_items` (each with a granular status and optional skill/tool references), a lifecycle `status`, and a `source`.

```typescript
type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface PlanActionItem {
  description: string;
  status: ActionItemStatus;
  related_skills?: string[];  // Skill IDs this step relies on (e.g. 'alert_triage')
  related_tools?: string[];   // Tool IDs this step relies on (e.g. 'platform.search')
}

interface Plan {
  title: string;
  description?: string;
  action_items: PlanActionItem[];
  status: PlanStatus;   // 'draft' | 'ready'
  source: PlanSource;   // 'planning' | 'agent'
}
```

**Rationale**: The previous design used `completed: boolean`. A four-state status is more expressive:
- `pending`: Not yet started (hollow circle in UI)
- `in_progress`: Agent is currently working on this item (pulsing/accent indicator, bold text)
- `completed`: Successfully finished (green checkmark, subdued text)
- `failed`: Could not be completed (red X, explanation available in conversation)

This enables the UI to show which item the agent is *currently* working on, not just what's done. The `update_plan` tool accepts `status` per item. The `in_progress` → `completed` / `failed` transition happens as the agent works through items.

Other design points:
- The index is implicit (array position), not set by the LLM
- `source` tracks origin: `'planning'` (user-initiated, requires approval) vs `'agent'` (self-planned, no approval). This drives the approval flow behavior — see Decision 16.
- No nested plans or sub-tasks (keep it simple for v1)
- The `title` serves as a plan summary for UI display
- The `description` is optional context the agent can use to explain the plan's overall approach
- `related_skills` and `related_tools` are optional arrays of IDs that annotate which capabilities each step will use. These are set by the agent during plan creation (informed by skill/tool discovery) and rendered as badges in the UI. They serve as documentation for the user and provide traceability between plan steps and the agent's capabilities.

### 10. Streaming events for plan lifecycle and mode suggestion

**Decision**: Three new `ChatEventType` values: `plan_created`, `plan_updated`, and `mode_suggestion`.

```typescript
// Emitted when create_plan tool is called
plan_created → { plan: Plan }

// Emitted when update_plan tool is called (including status changes)
plan_updated → { plan: Plan }

// Emitted when suggest_planning_mode tool is called
mode_suggestion → { suggested_mode: AgentMode, reason: string }
```

**Rationale**: Using distinct event types (rather than a generic "plan_changed") lets the UI differentiate between initial plan creation (trigger animation, expand panel) and subsequent updates (update checkmarks, highlight changed items, show "Approve & Execute" button when status becomes `ready`). Both plan events carry the full plan state to simplify the UI — no need for incremental diffs. The `mode_suggestion` event enables the UI to show a structured suggestion banner (with a "Switch to Planning Mode" button) rather than relying on the agent to express the suggestion purely in prose.

### 11. Planning tool definitions

**Decision**: Four tools with mode-dependent availability, included via `selectTools` pattern (not `isAvailable`).

**`create_plan`** (both modes):
- Input: `{ title: string, description?: string, action_items: Array<{ description: string, related_skills?: string[], related_tools?: string[] }> }`
- **In planning mode**: Creates a plan with `status: 'draft'`, `source: 'planning'`. The plan requires user approval before execution.
- **In agent mode**: Creates a plan with `status: 'ready'`, `source: 'agent'`. The plan is immediately executable — no approval gate. The agent can start executing right away.
- Both: Replaces any existing plan. All items start as `status: 'pending'`. Emits `plan_created` event.

**`update_plan`** (both modes):
- Input: `{ items?: Array<{ index: number, status: ActionItemStatus }>, plan_status?: PlanStatus }`
- Behavior: Updates the status of action items and/or the plan lifecycle status.
- Precondition: A plan must exist (error if no plan).
- Output: The updated plan.
- Side effect: Emits `plan_updated` event, updates plan in conversation state.

**`suggest_planning_mode`** (agent mode only, no plan exists):
- Input: `{ reason: string }`
- Behavior: Emits a `mode_suggestion` event via `AgentEventEmitter`. Returns a confirmation message to the LLM ("Planning mode suggestion sent to the user.").
- Rationale: Using a tool (rather than raw event emission) is more reliable. LLMs can only trigger side effects through tool calls — they cannot emit events directly. The tool is lightweight and has no execution side effects beyond the event.

**`list_available_tools`** (planning mode only):
- Input: `{ filter?: string }`
- Behavior: Queries the tool registry for metadata (id, type, description). Optional keyword filter. Returns metadata only, no schemas or handlers.
- Rationale: Gives the agent visibility into available tools without execution access.

**Tool selection** (NOT via `isAvailable`):

The actual `ToolAvailabilityContext` is `{ request, uiSettings, spaceId }` — it does NOT include `agentMode`, `experimentalFeatures`, or `conversationState`. Therefore, planning tools cannot be gated via the standard `availability.handler` mechanism. Instead:
- Planning tools are defined as internal tool definitions (like filestore tools in `getStoreTools()`)
- `selectPlanningTools()` returns the right set for planning mode
- In agent mode, planning tools are constructed in `run_chat_agent.ts` and appended to the `staticTools` array returned by `selectTools()` — this avoids changing the `selectTools` signature and keeps the change localized

This follows the exact pattern already used for filestore tools.

**Tool factory pattern** (closure over event emitter and plan state):

Planning tools need to emit custom events (`plan_created`, `plan_updated`, `mode_suggestion`) which are not supported by the standard `ToolEventEmitter`. They also need access to mutable plan state. The solution is a factory function:

```typescript
const getPlanningTools = ({
  eventEmitter,    // AgentEventEmitterFn from manualEvents$.next
  planState,       // { current: Plan | undefined } — mutable ref
  agentMode,       // current mode (affects create_plan behavior)
  toolProvider,    // for list_available_tools to query registry
}: PlanningToolsParams): ExecutableTool[] => {
  // Returns create_plan, update_plan, suggest_planning_mode, list_available_tools
  // Tool handlers close over eventEmitter and planState
};
```

This mirrors the `getStoreTools({ filestore })` pattern where tools close over their dependencies.

**Item status transitions**: The `update_plan` tool allows any status transition (e.g., `completed` → `in_progress` for retries, `failed` → `pending` for reattempts). Only the status value is validated (must be one of the four valid values). This keeps the logic simple — the LLM decides transitions.

**Plan item count limit**: `create_plan` validates `maxItems: 50` on the `action_items` array. Plans with more than 50 items are rejected with: "Plan cannot have more than 50 action items. Break large tasks into phases."

**Event ordering**: Plan events flow through `manualEvents$` which merges with graph events. The `addRoundCompleteEvent` operator appends the round complete event only after the graph finishes (which includes all tool calls). This ensures plan events arrive before `round_complete` naturally, since plan tool calls complete within the graph execution.

### 12. Feature flag gating

**Decision**: Add `planning: boolean` to `ExperimentalFeatures`. The existing `agentBuilder:experimentalFeatures` UI setting controls it (same as `filestore` and `skills`).

**Rationale**: This follows the established pattern. When the flag is disabled:
- Server: `agent_mode` parameter validation rejects anything other than `agent`
- Server: Planning tools are not included by `selectTools` / `selectPlanningTools`
- Client: Mode selector UI is hidden
- No changes needed for existing conversations or agent mode

### 13. UI plan panel as collapsible right sidebar

**Decision**: The plan is displayed in a collapsible right sidebar panel, separate from the conversation flow.

**Rationale**: The plan should be visible alongside the conversation, not mixed into it:
- **Inline placement** pushes the conversation down, breaking reading flow
- **A sidebar** allows the user to see both conversation (tool calls, results) and plan progress simultaneously
- During execution, this side-by-side view is especially valuable
- EUI has `EuiFlyout` and `EuiCollapsibleNav` that support this pattern well
- The panel can be collapsed/expanded without affecting conversation layout

Panel states:
- **Hidden**: No plan exists — no sidebar shown
- **Expanded**: Plan exists — sidebar shows plan panel
- **Collapsed**: User collapses sidebar — a small toggle button remains visible to re-expand

When a `plan_created` event fires and the sidebar is hidden, it auto-expands. The user can collapse it if they don't want to see it.

### 14. Mode selector as segmented control

**Decision**: The mode selector uses `EuiButtonGroup` (segmented control), not a dropdown.

**Rationale**: Both options are visible at all times (no click to discover). It's a binary choice — perfect for a segmented control. The current mode is always clear at a glance. Icons + labels: `[🔧 Agent]` `[📋 Plan]`.

### 15. Smart mode suggestion via tool call

**Decision**: When in agent mode, the agent can call the `suggest_planning_mode` tool to suggest switching to planning mode. This emits a `mode_suggestion` event which surfaces a dismissable banner in the UI.

**Rationale**: The previous design said the agent "emits a `mode_suggestion` event" directly. But agents can only trigger side effects through tool calls — they cannot emit raw events. Using a tool is more reliable and follows the established pattern. The `suggest_planning_mode` tool:
- Takes `{ reason: string }` as input
- Emits the `mode_suggestion` event via `AgentEventEmitter`
- Returns a confirmation to the LLM
- Is lightweight with no execution side effects

The agent mode instructions include complexity heuristics:
- The request involves multiple distinct steps or phases
- The user's query is open-ended or ambiguous
- The task scope spans multiple domains or tool categories
- The user explicitly asks "what would be the best approach" or similar phrasing

### 16. Agent-mode self-planning (no approval required)

**Decision**: The agent can use `create_plan` in agent mode to create an internal plan for complex tasks. Self-planned plans have `source: 'agent'` and `status: 'ready'`, and do NOT require user approval. The agent immediately proceeds to execute the plan after creating it.

**Rationale**: When the user stays in agent mode (either by declining a planning mode suggestion, or simply by sending a complex request without switching modes), the agent should still be able to organize its work. Self-planning gives the agent an internal execution framework:
- The plan is visible in the UI (so the user can track progress) but doesn't block execution
- The agent creates the plan and begins working on it in the same round
- The plan panel shows progress updates just like an approved plan
- This mirrors how humans often quickly sketch a plan before diving into work, without needing explicit "approval"

The `source: 'agent'` field on the plan distinguishes self-planned plans from user-initiated plans. The UI uses this to skip the approval flow (no "Approve & Execute" button, no draft state visible to user). The plan panel header shows "Agent's Plan" instead of just "Plan" to indicate it was self-created.

### 17. Item-level interaction in plan panel

**Decision**: Users can click a plan item in the sidebar to pre-fill the chat input with a reference to that step.

**Rationale**: This makes it easy to give targeted feedback without manually typing "about the third item in the plan." Clicking an item pre-fills: `"Regarding step 3 (Generate summary report): "`. This works in both modes:
- **Planning mode**: User gives feedback on a specific step → agent refines that part of the plan
- **Agent mode**: User asks about a specific in-progress or completed step → agent responds with context

### 18. Threading `agent_mode` through Task Manager execution path

**Decision**: Add `agentMode?: AgentMode` to `AgentExecutionParams` so it survives serialization/deserialization through the Task Manager path.

**Rationale**: The execution service serializes `AgentExecutionParams` into an ES document. The Task Manager deserializes it to run the agent. If `agent_mode` is not part of this structure, it would be lost in the TM path. The flow:
1. `conversePayloadSchema` parses `agent_mode`
2. Route handler passes it into `executionService.executeAgent({ params: { ...existingParams, agentMode } })`
3. `AgentExecutionParams` gains `agentMode?: AgentMode`
4. `handleAgentExecution()` reads it from `execution.agentParams.agentMode`
5. `executeAgent$()` passes it through to `agentService.execute()` → `agentParams`
6. `createAgentHandler()` plucks it and passes to `runAgent()`

### 19. Planning tools use factory pattern with event emitter closure

**Decision**: Planning tools are created via a `getPlanningTools()` factory function that receives the event emitter (`AgentEventEmitterFn` from `manualEvents$`), mutable plan state, current `agentMode`, and `toolProvider` as closures.

**Rationale**: Standard tool handlers receive `ToolHandlerContext.events` which only exposes `reportProgress()` and `sendUiEvent()` — not arbitrary `ChatAgentEvent` emission. Planning tools need to emit `plan_created`, `plan_updated`, and `mode_suggestion` events. Rather than extending the tool handler contract (which would be a larger change), we use the factory/closure pattern already established by `getStoreTools({ filestore })`. The factory is called within `runPlanningAgentMode` and `runDefaultAgentMode`, where `manualEvents$` is already in scope.

### 20. Client experimental features exposed via hook

**Decision**: Add a `useExperimentalFeatures()` hook that reads the `agentBuilder:experimentalFeatures` UI setting client-side and returns `ExperimentalFeatures`.

**Rationale**: The UI setting is currently only read server-side. The client needs it to conditionally render the mode selector, plan panel, and mode suggestion banner. The hook reads from `core.uiSettings.get(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)`, parses the result, and exposes it via React context (extending `useAgentBuilderContext()` or as a standalone hook). The setting ID constant is already exported from `common/ui_settings.ts`.

### 21. Type guard functions for new event types

**Decision**: Add `isPlanCreatedEvent`, `isPlanUpdatedEvent`, and `isModeSuggestionEvent` type guard functions in `@kbn/agent-builder-common`.

**Rationale**: The `useSubscribeToChatEvents` hook uses type guard functions in an if-else chain to dispatch event handling. Following the existing pattern (`isMessageChunkEvent`, `isToolCallEvent`, etc.), each new event type needs a corresponding guard. These are simple functions: `(event: ChatEvent): event is PlanCreatedEvent => event.type === ChatEventType.planCreated`.

### 22. Conversation layout change for sidebar

**Decision**: The `Conversation` component's top-level layout changes from a single-column `EuiFlexGroup` to a row-based layout wrapping the existing column and a conditional sidebar.

**Rationale**: The current layout is:
```
<EuiFlexGroup direction="column">
  <ConversationRounds />
  <ConversationInput />
</EuiFlexGroup>
```

With the sidebar, it becomes:
```
<EuiFlexGroup direction="row">
  <EuiFlexItem grow>  {/* existing column */}
    <EuiFlexGroup direction="column">
      <ConversationRounds />
      <ConversationInput />
    </EuiFlexGroup>
  </EuiFlexItem>
  {plan && <EuiFlexItem grow={false}><PlanSidebar /></EuiFlexItem>}
</EuiFlexGroup>
```

This is a non-trivial layout change that requires careful testing to ensure scrolling, responsive behavior, and the existing conversation flow are not broken. The sidebar `EuiFlexItem` uses `grow={false}` with a fixed width (e.g., 360px) that can be collapsed to 0.

### 23. Progress bar in plan panel header

**Decision**: The plan panel header includes a horizontal `EuiProgress` bar showing overall completion percentage.

**Rationale**: Users need at-a-glance plan completion status without scanning individual items. The progress bar shows `completed_count / total_count` as a percentage. It uses `EuiProgress` with `size="xs"` and appropriate colors (accent while executing, success when complete).

### 24. Collapsed sidebar shows progress badge

**Decision**: When the plan sidebar is collapsed, the toggle button shows a compact progress badge (e.g., "2/5").

**Rationale**: Users should be able to monitor plan progress even when the sidebar is collapsed. The badge provides at-a-glance status. It uses `EuiBadge` or `EuiNotificationBadge` next to the expand button.

## Risks / Trade-offs

**[Risk] LLM may not reliably create well-structured plans** — The agent might produce low-quality plans, create too many/few action items, or forget to mark the plan as ready.
→ **Mitigation**: Detailed system instructions with examples and constraints. The planning tools validate input structure (e.g. non-empty action items, valid indices). Iterative prompt engineering will be needed based on testing.

**[Risk] Agent may forget to set plan status to `ready`** — If the agent never marks the plan as ready, the approval flow is stuck.
→ **Mitigation**: The planning mode instructions explicitly state: "When you have no more questions and the plan is complete, you MUST use `update_plan` to set the status to `ready`." Additionally, the user can always manually toggle to agent mode, bypassing the approval flow.

**[Risk] Plan state grows unbounded** — If the agent creates many plans or plans with many items, `ConversationInternalState` grows.
→ **Mitigation**: Only one plan at a time (new `create_plan` replaces the old one). Plans are expected to be small (5-15 items). The state is already serialized and persisted; plan adds minimal overhead.

**[Risk] Mode switching mid-execution may cause confusion** — If the user switches back to planning mode while the agent is executing a plan, the agent loses access to execution tools.
→ **Mitigation**: Switching back to planning mode mid-execution is allowed (the plan state is preserved with items marked as completed so far). The agent in planning mode can discuss the plan but not continue executing. The user can switch back to agent mode to resume. The UI should make the current mode and plan status clear.

**[Risk] Mode suggestion may be annoying or too frequent** — If the agent suggests planning mode for every non-trivial request, it adds friction rather than value.
→ **Mitigation**: The agent mode instructions include heuristics (multi-step, ambiguous, multi-domain) and are tuned to bias toward action. The suggestion should only trigger for genuinely complex tasks. Additionally, the suggestion is non-blocking — it appears as a banner the user can dismiss, and the agent continues its response regardless.

**[Risk] Self-planned plans may be shallow** — When the agent self-plans in agent mode, it doesn't have the planning mode's focused discovery phase (though it still has all execution tools). Plans may be less thorough.
→ **Mitigation**: Self-planning is an organizational aid, not a formal planning process. The agent can still read skills and inspect tools in agent mode (it has full access). If the user wants a thorough plan with approval, they switch to planning mode.

**[Risk] Skill/tool references on plan items may become stale** — A skill or tool referenced by a plan item might be removed or renamed after the plan is created.
→ **Mitigation**: References are display-only (used for badges in the UI). At execution time, the agent uses the actual tool/skill registry, not the plan's references. If a referenced skill/tool no longer exists, the badge shows a "not found" indicator but execution is not blocked.

**[Risk] Sidebar panel may be too intrusive on small screens** — The collapsible sidebar takes horizontal space.
→ **Mitigation**: The sidebar is collapsible. On small screens / narrow viewports, it could default to collapsed with a toggle button. The plan panel auto-expands on `plan_created` but can be manually collapsed.

**[Trade-off] No user-editable plans** — Users cannot directly check off items, reorder them, or edit descriptions.
→ **Accepted**: This keeps v1 simple. User editing would require bidirectional state sync and conflict resolution. Users can still influence the plan via natural language in planning mode.

**[Trade-off] Plan replaced, not versioned** — `create_plan` replaces the entire plan with no history.
→ **Accepted**: Plan versioning adds complexity with limited value for v1. The conversation history implicitly captures plan evolution through the `plan_created`/`plan_updated` events in round data.

**[Trade-off] Full plan sent in every event** — Both `plan_created` and `plan_updated` events carry the complete plan state.
→ **Accepted**: Plans are small. Sending the full state eliminates the need for incremental diff logic in the UI and avoids state synchronization bugs.

**[Trade-off] No auto-mode-switch on chat reply** — Users must explicitly click "Approve & Execute" or toggle the mode selector; replying in chat doesn't trigger execution.
→ **Accepted**: This eliminates the class of accidental execution bugs. The cost is one extra click. The "Approve & Execute" button is prominent and discoverable when the plan is ready.
