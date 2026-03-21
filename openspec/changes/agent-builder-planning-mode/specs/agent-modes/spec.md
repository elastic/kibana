## Capability: Agent Modes

Infrastructure for agent execution modes — the `AgentMode` type, mode parameter on the converse API, mode-based routing in the agent execution flow, Task Manager threading, plan approval via explicit button, and feature-flag gating.

## Modes

| Mode | Purpose | Tools Available | Plan Behavior |
|------|---------|----------------|---------------|
| `agent` | Execution (current default) | All regular tools + `create_plan` + `update_plan` (if plan exists) + `suggest_planning_mode` (if no plan) | Executes plan if one exists; may self-plan for complex tasks (no approval needed); suggests planning mode for complex queries |
| `planning` | Plan creation & refinement | `create_plan` + `update_plan` + `list_available_tools` (read-only) + skill filesystem (read-only) + filestore tools (if enabled) | Creates/refines plan with skill/tool context, asks follow-up questions, marks plan ready |

## Types

### `AgentMode`

```typescript
// @kbn/agent-builder-common (x-pack/platform/packages/shared/agent-builder/agent-builder-common/agents/mode.ts)
export type AgentMode = 'agent' | 'planning';

export const DEFAULT_AGENT_MODE: AgentMode = 'agent';
```

### `PlanSource`

```typescript
// @kbn/agent-builder-common (x-pack/platform/packages/shared/agent-builder/agent-builder-common/chat/plan.ts)
export type PlanSource = 'planning' | 'agent';
```

Tracks who initiated the plan:
- `'planning'`: User explicitly entered planning mode → plan requires approval before execution
- `'agent'`: Agent self-planned in agent mode → no approval needed, immediate execution

### `ExperimentalFeatures` (updated)

```typescript
// @kbn/agent-builder-server (x-pack/platform/packages/shared/agent-builder/agent-builder-server/agents/provider.ts)
export interface ExperimentalFeatures {
  filestore: boolean;
  skills: boolean;
  planning: boolean;  // NEW
}
```

## API Changes

### Converse Request Body

The `ChatRequestBodyPayload` interface gains an optional `agent_mode` field:

```typescript
// agent_builder/common/http_api/chat.ts (plugin's common dir)
export interface ChatRequestBodyPayload {
  // ... existing fields
  agent_mode?: AgentMode;
}
```

The route validation schema (`conversePayloadSchema`) adds:

```typescript
agent_mode: schema.maybe(
  schema.oneOf([schema.literal('agent'), schema.literal('planning')], {
    defaultValue: 'agent',
  })
),
```

### Gating

When `experimentalFeatures.planning` is `false`:
- The server rejects `agent_mode` values other than `'agent'` with HTTP 400: `"Planning mode is not enabled. Enable experimental features in Kibana advanced settings."`
- The validation occurs in the converse route handler, before execution begins.

## Server Routing

### `RunAgentParams` (updated)

```typescript
// server/services/agents/modes/run_agent.ts
export interface RunAgentParams {
  // ... existing fields
  agentMode: AgentMode;
}
```

### `runAgent()` dispatch

```typescript
export const runAgent = async (
  params: RunAgentParams,
  context: AgentHandlerContext
): Promise<RunAgentResponse> => {
  switch (params.agentMode) {
    case 'planning':
      return runPlanningAgentMode(params, context);
    case 'agent':
    default:
      return runDefaultAgentMode(params, context);
  }
};
```

### Mode Behavior

#### Planning Mode (`runPlanningAgentMode`)

- Reuses graph building blocks: `createAgentGraph`, `convertGraphEvents`, `addRoundCompleteEvent`, `extractRound`, `prepareConversation`
- **Own tool selection** via `selectPlanningTools()`: `create_plan`, `update_plan`, `list_available_tools`, plus filestore tools if `experimentalFeatures.filestore` is enabled
- **Own prompt factory** via `createPlanningPromptFactory()`: planning-specific system instructions
- Mounts skills filesystem read-only (via `createStore`), gated on `experimentalFeatures.skills`
- If an existing plan is present in conversation state, includes the plan in the prompt
- The agent reads skill content and tool metadata to inform the plan, annotating each action item with the skills/tools it depends on
- The agent creates/refines the plan, asks follow-up questions, and marks the plan `ready` when finalized
- The agent does NOT execute any tasks — only plans and discovers capabilities

#### Agent Mode (`runDefaultAgentMode` — full behavior)

- Normal agent behavior with all regular tools
- **Planning tools** constructed via `getPlanningTools()` factory and appended to `staticTools` from `selectTools()` (gated on `experimentalFeatures.planning`):
  - `create_plan`: Always included when planning enabled (for self-planning)
  - `suggest_planning_mode`: Included when planning enabled AND no plan exists
  - `update_plan`: Included when a plan exists in conversation state
  - The factory receives `eventEmitter` (from `manualEvents$.next`), `planState` (mutable ref), `agentMode`, and `toolProvider` as closures
- **Smart mode suggestion**: The agent's system instructions include a directive to evaluate task complexity. For complex, multi-step requests, the agent calls `suggest_planning_mode` tool which emits a `mode_suggestion` event.
- **Self-planning**: If the user stays in agent mode (or doesn't switch after a suggestion), the agent can use `create_plan` to build an internal plan. Plans created in agent mode have `source: 'agent'` and `status: 'ready'` — they do not require user approval. The agent immediately proceeds to execute.
- **Plan-aware execution**: If a plan exists in `ConversationInternalState` (whether user-approved from planning mode or self-planned):
  - `update_plan` tool is additionally available
  - Plan context (items, status) is injected into the system prompt
  - Plan execution instructions are appended: "Execute the plan step by step..."
- If no plan exists: behaves identically to the current default mode

### Threading through Task Manager

The `agent_mode` value flows through the execution stack, including the Task Manager path:

1. `conversePayloadSchema` → parsed `agent_mode` (defaults to `'agent'`)
2. Route handler → `executionService.executeAgent({ params: { ...params, agentMode } })`
3. `AgentExecutionParams.agentMode` → serialized into ES execution document
4. **[TM path]**: Task handler deserializes `execution.agentParams.agentMode`
5. **[Local path]**: `handleAgentExecution()` reads `execution.agentParams.agentMode`
6. `executeAgent$()` → `agentService.execute()` → `agentParams.agentMode`
7. `createAgentHandler()` → plucks `agentMode` → `runAgent()` with `agentMode` in `RunAgentParams`

### Client-Side Experimental Features

The `agentBuilder:experimentalFeatures` UI setting is currently only read server-side. For the UI to conditionally render planning components, the client needs access:

```typescript
// public/application/hooks/use_experimental_features.ts (new)
export const useExperimentalFeatures = (): ExperimentalFeatures => {
  const { uiSettings } = useKibana().services;
  const raw = uiSettings.get(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
  return {
    filestore: raw,
    skills: raw,
    planning: raw,
  };
};
```

Exposed via `useAgentBuilderContext()` or as a standalone hook. Used by:
- `AgentModeSelector` (visibility)
- `PlanPanel` (visibility)
- `ModeSuggestionBanner` (visibility)

### Experimental feature parsing

```typescript
// server/services/runner/run_agent.ts (updated)
const experimentalFeatures: ExperimentalFeatures = {
  filestore: experimentalFeaturesEnabled,
  skills: experimentalFeaturesEnabled,
  planning: experimentalFeaturesEnabled,  // NEW
};
```

## Mode Suggestion Event

When the agent in agent mode evaluates a complex task, it calls `suggest_planning_mode` tool which emits a `mode_suggestion` event:

```typescript
export enum ChatEventType {
  // ...existing
  modeSuggestion = 'mode_suggestion',
}

export interface ModeSuggestionEventData {
  suggested_mode: AgentMode;
  reason: string; // "This task involves multiple steps that would benefit from upfront planning..."
}
```

The UI renders this as a dismissable banner with a "Switch to Planning Mode" button. If the user clicks it, the mode selector switches to `planning`. If the user dismisses it (or ignores it), the agent continues in agent mode and may self-plan.

The agent mode instructions include complexity heuristics:
- The request involves multiple distinct steps or phases
- The user's query is open-ended or ambiguous
- The task spans multiple domains or tool categories
- The user explicitly asks for an approach, strategy, or plan

## Plan Approval Flow

The plan approval uses **explicit user actions**: an "Approve & Execute" button or manual mode toggle. There is NO auto-mode-switch on chat reply.

### Approval Triggers

1. **User clicks "Approve & Execute"** in the plan panel:
   - The UI switches the mode selector to `agent`
   - Pre-fills the message editor with "Execute the plan." (user can customize before sending)

2. **User toggles mode selector** from `planning` → `agent`:
   - If a plan with status `ready` and `source: 'planning'` exists, the UI pre-fills "Execute the plan."
   - If no plan or plan is `draft`, switches to normal agent mode (no pre-fill)

3. **User manually types a message in agent mode**:
   - Standard flow — the user is already in agent mode, types and sends

### Why no auto-switch on chat reply

Replying in planning mode always stays in planning mode, regardless of plan status. This prevents accidental execution when the user types "Can you explain step 2 more?" with a ready plan. The cost is one extra click (the "Approve & Execute" button), but it eliminates the entire class of accidental execution bugs.

## Files Affected

| File | Change |
|------|--------|
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/agents/mode.ts` | New file: `AgentMode` type, `DEFAULT_AGENT_MODE` |
| `x-pack/platform/plugins/shared/agent_builder/common/http_api/chat.ts` | Add `agent_mode` to `ChatRequestBodyPayload` |
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/agents/index.ts` | Export new mode types |
| `x-pack/platform/packages/shared/agent-builder/agent-builder-server/agents/provider.ts` | Add `planning` to `ExperimentalFeatures` |
| `x-pack/platform/plugins/shared/agent_builder/server/routes/chat.ts` | Add `agent_mode` to `conversePayloadSchema`, gating logic |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/run_agent.ts` | Add `agentMode` to `RunAgentParams`, dispatch logic |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/create_handler.ts` | Pluck `agentMode` from `agentParams`, pass to `runAgent()` |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/planning/` | New directory: planning mode handler |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/run_chat_agent.ts` | Plan-aware path: detect plan, include planning tools via `selectTools`, inject context + instructions; `suggest_planning_mode` tool inclusion |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/prompts/plan_execution_instructions.ts` | New: plan execution instructions for agent mode |
| `x-pack/platform/plugins/shared/agent_builder/server/services/agents/modes/default/prompts/mode_suggestion_instructions.ts` | New: instructions for evaluating task complexity and suggesting planning mode |
| `x-pack/platform/plugins/shared/agent_builder/server/services/runner/run_agent.ts` | Parse `planning` experimental feature |
| `x-pack/platform/plugins/shared/agent_builder/server/services/execution/types.ts` | Add `agentMode` to `AgentExecutionParams` |
| `x-pack/platform/plugins/shared/agent_builder/server/services/execution/execution_runner.ts` | Thread `agentMode` through to `executeAgent$()` |
| `x-pack/platform/plugins/shared/agent_builder/server/services/execution/utils/execute_agent.ts` | Include `agentMode` in `agentParams` |
| `x-pack/platform/plugins/shared/agent_builder/public/application/hooks/use_experimental_features.ts` | New: hook to read experimental features UI setting client-side |
