## Capability: Planning Tools

The `create_plan`, `update_plan`, `suggest_planning_mode`, and `list_available_tools` tools, planning mode system instructions, plan-aware agent mode instructions, the plan data structure with lifecycle status, and plan state management in `ConversationInternalState`.

## Plan Data Structure

### Types

```typescript
// @kbn/agent-builder-common (x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/plan.ts)

export type PlanStatus = 'draft' | 'ready';

/** Tracks who initiated the plan — determines the approval flow */
export type PlanSource = 'planning' | 'agent';

/** Granular status for individual action items */
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PlanActionItem {
  /** Description of the action item */
  description: string;
  /** Granular status of this item */
  status: ActionItemStatus;
  /** Skill IDs this step relies on (e.g. ['alert_triage', 'observability_log_analysis']) */
  related_skills?: string[];
  /** Tool IDs this step relies on (e.g. ['platform.search', 'esql']) */
  related_tools?: string[];
}

export interface Plan {
  /** Short title summarizing the plan */
  title: string;
  /** Optional longer description of the plan's approach */
  description?: string;
  /** Ordered list of action items */
  action_items: PlanActionItem[];
  /** Lifecycle status: draft (still refining) or ready (approved for execution) */
  status: PlanStatus;
  /** Who initiated the plan: 'planning' (user-initiated, requires approval) or 'agent' (self-planned, no approval) */
  source: PlanSource;
}
```

### Conversation State

```typescript
// @kbn/agent-builder-common (x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/conversation.ts) (updated)
export interface ConversationInternalState {
  prompt?: PromptStorageState;
  dynamic_tool_ids?: string[];
  plan?: Plan;  // NEW
}
```

## Streaming Events

### New Event Types

```typescript
// @kbn/agent-builder-common (x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/events.ts) (updated)
export enum ChatEventType {
  // ... existing values
  planCreated = 'plan_created',
  planUpdated = 'plan_updated',
  modeSuggestion = 'mode_suggestion',
}
```

### Event Data

```typescript
export interface PlanCreatedEventData {
  plan: Plan;
}

export interface PlanUpdatedEventData {
  plan: Plan;
}

export interface ModeSuggestionEventData {
  suggested_mode: AgentMode;
  reason: string;
}

export type PlanCreatedEvent = AgentBuilderEvent<ChatEventType.planCreated, PlanCreatedEventData>;
export type PlanUpdatedEvent = AgentBuilderEvent<ChatEventType.planUpdated, PlanUpdatedEventData>;
export type ModeSuggestionEvent = AgentBuilderEvent<ChatEventType.modeSuggestion, ModeSuggestionEventData>;
```

All three event types are added to the `ChatAgentEvent` union type so they flow through the SSE stream.

### Type Guards

```typescript
// @kbn/agent-builder-common (following isMessageChunkEvent pattern)
export const isPlanCreatedEvent = (event: ChatEvent): event is PlanCreatedEvent =>
  event.type === ChatEventType.planCreated;

export const isPlanUpdatedEvent = (event: ChatEvent): event is PlanUpdatedEvent =>
  event.type === ChatEventType.planUpdated;

export const isModeSuggestionEvent = (event: ChatEvent): event is ModeSuggestionEvent =>
  event.type === ChatEventType.modeSuggestion;
```

These are used by `useSubscribeToChatEvents` in the client's if-else event dispatch chain.

### Event Ordering

Plan events flow through `manualEvents$` (emitted by tool handlers via the factory closure). `manualEvents$` is `merge`d with graph events. The `addRoundCompleteEvent` operator appends the round complete event only after the graph stream finishes (which includes all tool calls). This ensures plan events arrive before `round_complete` naturally — no special ordering logic needed.

## Tool Definitions

### Important: Tool selection pattern (NOT `isAvailable`)

The actual `ToolAvailabilityContext` is `{ request: KibanaRequest, uiSettings: IUiSettingsClient, spaceId: string }`. It does NOT include `agentMode`, `experimentalFeatures`, or `conversationState`. Therefore, planning tools **cannot** be gated via `availability.handler`.

Instead, planning tools use a **factory pattern with closures**, matching `getStoreTools({ filestore })`:

```typescript
// modes/planning/tools/get_planning_tools.ts
const getPlanningTools = ({
  eventEmitter,    // AgentEventEmitterFn from manualEvents$.next
  planState,       // { current: Plan | undefined } — mutable ref
  agentMode,       // current mode (affects create_plan behavior)
  toolProvider,    // for list_available_tools to query tool registry
}: PlanningToolsParams): ExecutableTool[] => { ... };
```

- Tool handlers close over `eventEmitter` and `planState` to emit events and update plan state
- `selectPlanningTools()` calls `getPlanningTools()` for planning mode
- In agent mode, `run_chat_agent.ts` calls `getPlanningTools()` and appends the relevant tools to `staticTools` from `selectTools()` — no `selectTools` signature change needed
- The mode handler decides which tools to include based on `agentMode`, `experimentalFeatures`, and plan existence

### `create_plan`

**Purpose**: Creates a new structured plan for the current conversation. Replaces any existing plan. Available in both modes — behavior varies by mode.

**Included by**: `selectPlanningTools()` (planning mode) AND `selectTools()` (agent mode, when `experimentalFeatures.planning` is enabled)

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Short title summarizing the plan"
    },
    "description": {
      "type": "string",
      "description": "Optional longer description of the approach"
    },
    "action_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": {
            "type": "string",
            "description": "What this step accomplishes"
          },
          "related_skills": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Skill IDs this step relies on (e.g. ['alert_triage']). Use skill discovery to find relevant skills."
          },
          "related_tools": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Tool IDs this step relies on (e.g. ['platform.search', 'esql']). Use list_available_tools to find relevant tools."
          }
        },
        "required": ["description"]
      },
      "minItems": 1,
      "description": "Ordered list of action items to complete"
    }
  },
  "required": ["title", "action_items"]
}
```

**Handler behavior**:
1. Construct a `Plan` from the input, with all `action_items` having `status: 'pending'`
2. Set `source` and `status` based on the current mode:
   - **Planning mode**: `source: 'planning'`, `status: 'draft'` (requires user approval)
   - **Agent mode**: `source: 'agent'`, `status: 'ready'` (no approval needed, immediate execution)
3. Store the plan in the mutable plan state (accessible via `getConversationState()`)
4. Emit a `plan_created` event via the `AgentEventEmitter`
5. Return the created plan as the tool result

**Validation**:
- `title` must be non-empty
- `action_items` must contain at least 1 item and at most 50 items (error: "Plan cannot have more than 50 action items. Break large tasks into phases.")
- Each item's `description` must be non-empty

### `update_plan`

**Purpose**: Updates the status of action items and/or the plan lifecycle status. Available in both planning mode (to refine and finalize the plan) and agent mode (to track progress during execution).

**Included by**: `selectPlanningTools()` (planning mode) AND `selectTools()` (agent mode, when a plan exists)

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "index": {
            "type": "number",
            "description": "Zero-based index of the action item to update"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "in_progress", "completed", "failed"],
            "description": "New status for this action item"
          }
        },
        "required": ["index", "status"]
      },
      "description": "Action items to update (optional if only changing plan status)"
    },
    "plan_status": {
      "type": "string",
      "enum": ["draft", "ready"],
      "description": "Update the plan lifecycle status. Set to 'ready' when the plan is finalized and ready for user approval."
    }
  }
}
```

**Handler behavior**:
1. Validate that a plan exists in conversation state (error if not)
2. If `items` is provided: validate all indices are within range, update `status` of each item
3. If `plan_status` is provided: update the plan's lifecycle status
4. At least one of `items` or `plan_status` must be provided
5. Store the updated plan in the mutable plan state
6. Emit a `plan_updated` event via the `AgentEventEmitter`
7. Return the updated plan as the tool result

**Status transitions**: Any status transition is allowed (e.g., `completed` → `in_progress` for retries, `failed` → `pending` for reattempts). Only the status value is validated (must be one of the four valid values: `pending`, `in_progress`, `completed`, `failed`). This keeps the logic simple — the LLM decides transitions.

**Error handling** (uses `ToolResultType.error` / `createErrorResult()` pattern):
- No plan exists: return error result `"No plan exists. Use create_plan first."`
- Index out of range: return error result `"Invalid action item index: {index}. Plan has {length} items (0-indexed)."`
- Neither `items` nor `plan_status` provided: return error result `"At least one of 'items' or 'plan_status' must be provided."`
- Invalid status value: return error result `"Invalid status: {value}. Must be one of: pending, in_progress, completed, failed."`

### `suggest_planning_mode`

**Purpose**: Suggests to the user that they switch to planning mode for a complex task. Emits a `mode_suggestion` event. Only available in agent mode when no plan exists.

**Included by**: `selectTools()` (agent mode, when `experimentalFeatures.planning` is enabled AND no plan exists)

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "reason": {
      "type": "string",
      "description": "Brief explanation of why planning mode would help (e.g. 'This task involves multiple steps across different data sources')"
    }
  },
  "required": ["reason"]
}
```

**Handler behavior**:
1. Emit a `mode_suggestion` event via the `AgentEventEmitter` with `{ suggested_mode: 'planning', reason }`
2. Return `"Planning mode suggestion sent to the user. Continue with the current request — the user may or may not switch modes."` as the tool result

**Rationale**: Using a tool (rather than raw event emission) is more reliable. LLMs can only trigger side effects through tool calls — they cannot emit events directly. The tool is lightweight: no state changes, no execution side effects beyond the event.

### `list_available_tools`

**Purpose**: Lists all available tools with their IDs and descriptions, so the agent can discover which tools exist and annotate plan items with relevant tool references. Read-only — does not execute any tool. Only available in planning mode.

**Included by**: `selectPlanningTools()` (planning mode only)

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "filter": {
      "type": "string",
      "description": "Optional keyword to filter tools by name or description"
    }
  }
}
```

**Handler behavior**:
1. Query the `toolProvider` (received via factory closure) for all available tool definitions
2. If `filter` is provided, filter tools whose `id` or `description` contains the keyword (case-insensitive)
3. Return a list of `{ id, type, description, tags }` for each matching tool — no schemas, no handlers, metadata only

**Rationale**: This gives the agent visibility into what tools are available without granting the ability to call them. Combined with skill filesystem access (which lets the agent read skill content), the agent can build plans that accurately reference the capabilities it will have in agent mode.

## Skill & Tool Discovery in Planning Mode

### Skills Filesystem (Read-Only)

In planning mode, the skills filesystem is mounted read-only on the agent's `VirtualFileSystem` via the existing `createStore()` → `SkillsStore` → `MemoryVolume` mechanism, exactly as in agent mode. This gives the agent access to:
- Skill content (instructions, domain knowledge in markdown)
- Skill metadata (name, description)
- Referenced content within skills

The skills filesystem access is gated on `experimentalFeatures.skills` (in addition to `experimentalFeatures.planning`). If skills are disabled, the filesystem is not mounted and the agent plans without skill context.

The planning mode instructions tell the agent to read relevant skill files before creating the plan:
- "Before creating a plan, review the available skills to understand what capabilities you have. Read skill content files to understand the domain knowledge and tool bindings each skill provides."
- "When creating action items, annotate each item with `related_skills` (skill IDs) and `related_tools` (tool IDs) that the step will use during execution."

### Tool Discovery

The `list_available_tools` read-only tool allows the agent to query the tool registry for metadata. This is complementary to skill discovery — skills bind tools, but some tools are standalone (user-created tools, MCP tools, etc.).

Together, skill filesystem + `list_available_tools` give the agent a complete picture of available capabilities without executing anything.

## Plan State Management

### State Flow

1. **Round start**: If continuing a conversation, the existing plan is read from `conversation.state?.plan`
2. **During round (planning mode)**: Agent reads skills and tool metadata for context. `create_plan` and `update_plan` tools modify a mutable plan reference. The agent creates, refines, and finalizes the plan.
3. **During round (agent mode with plan)**: `update_plan` tool sets items to `in_progress` → `completed`/`failed`. Regular tools execute the plan steps.
4. **Round end**: `getConversationState()` includes the current plan in `ConversationInternalState.plan` (alongside `prompt` from `promptManager.dump()` and `dynamic_tool_ids` from `toolManager.getDynamicToolIds()`)
5. **Persistence**: The plan is saved with the conversation via `RoundCompleteEvent.conversation_state`
6. **Next round**: Plan is available again via step 1

### Plan Lifecycle

```
Planning Mode (source: 'planning'):
[No Plan] ──create_plan──► [Draft] ──update_plan(plan_status:ready)──► [Ready]
                              │                                            │
                              │ (user refines in                           │ (user clicks
                              │  planning mode)                            │  "Approve & Execute")
                              ▼                                            ▼
                           [Draft]                                    [Executing]
                                                                          │
                                                                          │ (all items completed)
                                                                          ▼
                                                                     [Completed]

Agent Mode (source: 'agent'):
[No Plan] ──create_plan──► [Ready/Executing] ──────────────────► [Completed]
                             (no approval gate;                    (all items done)
                              agent starts executing
                              immediately)
```

Note: "Executing" and "Completed" are UI-derived states, not stored in the plan. They are inferred:
- **Executing**: Plan exists, status is `ready`, agent mode is `agent`, some items are not `completed`
- **Completed**: Plan exists, all action items have `status: 'completed'`

### Plan Context in Prompts

#### Planning Mode — System Prompt Injection

When an existing plan is present at round start in planning mode:

```
## Current Plan (Draft)

Title: {plan.title}
Description: {plan.description}

Action Items:
[pending] 1. {item description}
[pending] 2. {item description}
...

Plan Status: {plan.status}

Continue refining this plan based on the user's feedback. When you are satisfied
the plan is complete and have no more questions, use update_plan to set the plan_status to "ready".
```

#### Agent Mode — Plan Execution Prompt Injection

When a plan exists in agent mode:

```
## Active Plan

Title: {plan.title}
Description: {plan.description}

Action Items:
[completed] 1. {completed item description}
[in_progress] 2. {item the agent is working on}
[pending] 3. {upcoming item description}
...

Progress: {completed}/{total} items completed.

INSTRUCTIONS: Execute this plan step by step. For each incomplete item:
1. Use update_plan to set the item status to "in_progress"
2. Perform the required actions using your available tools
3. Use update_plan to mark the item as "completed" (or "failed" if it cannot be done)
4. Move to the next pending item
5. Summarize what was accomplished after each step
```

## Planning Mode System Instructions

The planning mode handler injects system instructions via `createPlanningPromptFactory()`. These replace the standard execution-oriented instructions.

Key instruction content:
- **Planning protocol**: "You are in PLANNING MODE. Your job is to create a clear, actionable plan for the user's request. You must NOT execute the plan — only create and refine it."
- **Capability discovery**: "BEFORE creating a plan, review the available skills and tools to understand your capabilities. Read skill content files to understand domain knowledge and tool bindings. Use `list_available_tools` to discover available tools and their descriptions. This informs what is achievable in each plan step."
- **Plan creation guidance**: "Break the task into clear, actionable steps. Each step should be concrete and verifiable. Use the `create_plan` tool to structure the plan. For each action item, annotate it with `related_skills` and `related_tools` to indicate which skills and tools that step will use during execution."
- **Follow-up questions**: "If the user's request is ambiguous or you need more information, ask follow-up questions BEFORE creating the plan. It's better to ask than to guess."
- **Plan finalization**: "When you are satisfied the plan is complete and have no more questions for the user, use `update_plan` with `plan_status: 'ready'` to mark the plan as finalized. Explain to the user that the plan is ready and they can proceed to execution by clicking 'Approve & Execute'."
- **Existing plan handling**: "If a plan already exists from a previous round, review it and continue refining based on the user's latest feedback. Do not recreate the plan unless the user explicitly asks for a new approach."
- **No execution**: "Do NOT execute any plan steps. Do NOT use search tools, ES|QL tools, MCP tools, or any other execution tools. You may only use planning tools (`create_plan`, `update_plan`), the skill filesystem (read-only), and `list_available_tools` (read-only). Planning mode is for planning and capability discovery only."
- **Plan scope**: "Keep plans focused. 5-15 action items is typical. If a task requires more, break it into phases."

## Agent Mode Instructions (with Plan Awareness & Self-Planning)

The agent mode system instructions cover three scenarios: mode suggestion, self-planning, and plan execution.

### Smart Mode Suggestion

Key instruction content:
- **Complexity evaluation**: "Before responding, evaluate whether the user's request is complex enough to benefit from upfront planning. Consider: Does it involve multiple distinct steps? Is it open-ended or ambiguous? Does it span multiple domains or tool categories?"
- **Suggestion protocol**: "If the task would benefit from planning, use the `suggest_planning_mode` tool to suggest that the user switch to Planning mode. Provide a brief reason why planning would help."
- **Non-blocking**: "The suggestion is informational. If the user does not switch, proceed with agent mode. You may self-plan if the task is still complex."

### Self-Planning (No Approval Required)

Key instruction content:
- **When to self-plan**: "If you are in agent mode and the task is complex (multiple steps, multiple tools), you may use `create_plan` to organize your work into a structured plan. This plan does NOT require user approval — you should proceed to execute it immediately."
- **Self-plan creation**: "When you create a plan in agent mode, it will automatically have `source: 'agent'` and `status: 'ready'`. Begin executing the first item right away after creating the plan."
- **Transparency**: "Briefly explain the plan to the user before starting execution, so they understand what you're about to do."

### Plan Execution (applies to both user-approved and self-planned plans)

Key instruction content:
- **Plan execution**: "You have an active plan to execute. Work through the plan items in order, starting from the first pending item."
- **Progress tracking**: "Before starting a step, use `update_plan` to set the item status to `in_progress`. After completing a step, use `update_plan` to mark it `completed`. If a step fails, mark it `failed` and explain why."
- **Tool usage**: "Use your available tools to accomplish each plan item. Choose the most appropriate tools for each step."
- **Completion**: "When all items are completed, summarize what was accomplished and whether the original goal was achieved."
- **Deviation handling**: "If a step cannot be completed or an unexpected issue arises, explain the situation to the user. Mark the item as `failed`. Do not skip items silently."

## Files Affected

| File | Change |
|------|--------|
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/plan.ts` | New file: `Plan`, `PlanActionItem`, `PlanStatus`, `PlanSource`, `ActionItemStatus` types |
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/events.ts` | Add `planCreated`, `planUpdated`, `modeSuggestion` to `ChatEventType`, event data types, union updates |
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/conversation.ts` | Add `plan` to `ConversationInternalState` |
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/index.ts` | Export plan types and events |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/` | New directory: planning mode handler |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/run_planning_agent.ts` | Planning mode entry point |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/tools/get_planning_tools.ts` | Factory function: `getPlanningTools({ eventEmitter, planState, agentMode, toolProvider })` returning tool definitions with closures |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/tools/select_planning_tools.ts` | Tool selection for planning mode (calls `getPlanningTools` + optional filestore tools) |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/prompts/` | Planning prompt factory |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/index.ts` | Barrel export |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/prompts/plan_execution_instructions.ts` | New: plan execution instructions for agent mode |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/prompts/mode_suggestion_instructions.ts` | New: instructions for evaluating task complexity |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/run_chat_agent.ts` | Plan-aware path: detect plan, include planning tools via `selectTools`, inject context + instructions |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/run_chat_agent.ts` | Construct planning tools via `getPlanningTools()` and append to `staticTools` (no `selectTools` signature change) |
