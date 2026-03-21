## 1. Common Types & Shared Package Changes

- [ ] 1.1 Add `AgentMode` type to `@kbn/agent-builder-common` (`'agent' | 'planning'`) with `DEFAULT_AGENT_MODE = 'agent'`
- [ ] 1.2 Add `PlanStatus` type (`'draft' | 'ready'`), `PlanSource` type (`'planning' | 'agent'`), and `ActionItemStatus` type (`'pending' | 'in_progress' | 'completed' | 'failed'`)
- [ ] 1.3 Add `Plan` and `PlanActionItem` types to `@kbn/agent-builder-common` (including `status: PlanStatus`, `source: PlanSource` on `Plan`, `status: ActionItemStatus`, `related_skills?: string[]` and `related_tools?: string[]` on `PlanActionItem`)
- [ ] 1.4 Add `agent_mode` field to `ChatRequestBodyPayload` in `agent_builder/common/http_api/chat.ts` (note: this is the plugin's `common/` dir, not the shared package)
- [ ] 1.5 Add `plan_created`, `plan_updated`, and `mode_suggestion` to `ChatEventType` enum with corresponding event data types (`PlanCreatedEventData`, `PlanUpdatedEventData`, `ModeSuggestionEventData`)
- [ ] 1.6 Add type guard functions: `isPlanCreatedEvent`, `isPlanUpdatedEvent`, `isModeSuggestionEvent` (following the `isMessageChunkEvent` pattern: check `event.type === ChatEventType.planCreated` etc.)
- [ ] 1.7 Add `plan?: Plan` field to `ConversationInternalState`
- [ ] 1.8 Export all new types from `@kbn/agent-builder-common` barrel

## 2. Server — Feature Flag & Experimental Features

- [ ] 2.1 Add `planning: boolean` to `ExperimentalFeatures` interface in `@kbn/agent-builder-server` (`x-pack/platform/packages/shared/agent-builder/agent-builder-server/agents/provider.ts`)
- [ ] 2.2 Update `server/services/runner/run_agent.ts` to parse the `planning` experimental feature from UI settings (same as `filestore`/`skills`)
- [ ] 2.3 Add `agent_mode` validation to converse route schema (`conversePayloadSchema` in `server/routes/chat.ts`): accept `'agent'` or `'planning'`, default to `'agent'`
- [ ] 2.4 Add server-side gating: reject `agent_mode: 'planning'` when experimental features are disabled (return 400)

## 3. Server — Agent Mode Routing & Task Manager Threading

- [ ] 3.1 Add `agentMode` to `RunAgentParams` interface (`server/services/agents/modes/run_agent.ts`)
- [ ] 3.2 Update `runAgent()` to dispatch based on `agentMode` (`'planning'` → `runPlanningAgentMode`, `'agent'` → `runDefaultAgentMode`)
- [ ] 3.3 Add `agentMode?: AgentMode` to `AgentExecutionParams` in `server/services/execution/types.ts` (must be serializable for Task Manager ES doc)
- [ ] 3.4 Thread `agent_mode` from converse route handler → `executeAgent()` params → `AgentExecutionParams.agentMode`
- [ ] 3.5 In `handleAgentExecution()` (`server/services/execution/execution_runner.ts`): read `agentMode` from `execution.agentParams` and pass to `executeAgent$()`
- [ ] 3.6 In `executeAgent$()` (`server/services/execution/utils/execute_agent.ts`): include `agentMode` in `agentParams` passed to `agentService.execute()`
- [ ] 3.7 In `createAgentHandler()` (`server/services/agents/modes/create_handler.ts`): pluck `agentMode` from `agentParams` and pass to `runAgent()`

## 4. Server — Planning Mode Handler

- [ ] 4.1 Create `modes/planning/` directory with `run_planning_agent.ts` entry point
- [ ] 4.2 Implement `runPlanningAgentMode()` that reuses graph building blocks (`createAgentGraph`, `convertGraphEvents`, `addRoundCompleteEvent`, `extractRound`) but uses its own `selectPlanningTools()` and `createPlanningPromptFactory()`
- [ ] 4.3 Implement `selectPlanningTools()`: constructs tools via `getPlanningTools()` factory (passing `eventEmitter`, `planState`, `agentMode`, `toolProvider`), returns `create_plan`, `update_plan`, `list_available_tools`, plus filestore tools if `experimentalFeatures.filestore` is enabled
- [ ] 4.4 Create `createPlanningPromptFactory()` (`modes/planning/prompts/`) implementing `PromptFactory` interface with `getMainPrompt`, `getAnswerPrompt`, `getStructuredAnswerPrompt`; covering: (a) discover skills/tools before planning, (b) create a plan with skill/tool annotations, (c) ask follow-up questions if needed, (d) explain the plan to the user, (e) set status to `ready` when plan is finalized, (f) do NOT execute the plan
- [ ] 4.4b Mount skills filesystem read-only in planning mode (reuse `SkillsStore` / `MemoryVolume` from `createStore`, gated on `experimentalFeatures.skills`)
- [ ] 4.5 Wire up plan state persistence: read existing plan from `ConversationInternalState` at round start, create mutable plan ref `{ current: Plan | undefined }`, pass to `getPlanningTools()`, write back via `getConversationState()` callback (same pattern as `promptManager.dump()` and `toolManager.getDynamicToolIds()`)
- [ ] 4.6 When existing plan is present at round start, include plan state in system prompt (items + status + plan lifecycle status)
- [ ] 4.7 Export `runPlanningAgentMode` and register in the mode index

## 5. Server — Plan-Aware Agent Mode & Self-Planning

- [ ] 5.1 Update default agent mode (`runDefaultAgentMode`) to detect existing plan in `ConversationInternalState`
- [ ] 5.2 When plan exists in agent mode: inject plan context into research agent system prompt via `createPromptFactory` (plan items, item status, instructions to execute step by step)
- [ ] 5.3 When plan exists in agent mode: construct planning tools via `getPlanningTools()` factory and append `update_plan` + `create_plan` to `staticTools` from `selectTools()` (simple approach — no `selectTools` signature change)
- [ ] 5.4 Create plan execution instructions (`modes/default/prompts/plan_execution_instructions.ts`): execute items in order, set items to `in_progress` before starting, mark `completed` or `failed` after each step, summarize progress
- [ ] 5.5 Update `getConversationState()` in `run_chat_agent.ts` to include plan state alongside prompt and dynamic tool IDs
- [ ] 5.6 Add smart mode suggestion instructions to agent mode prompt: evaluate task complexity, call `suggest_planning_mode` tool for complex/multi-step requests
- [ ] 5.7 Add self-planning instructions to agent mode prompt: if user stays in agent mode for a complex task, use `create_plan` to self-plan (creates plan with `source: 'agent'`, `status: 'ready'`), then immediately start executing
- [ ] 5.8 When no plan exists in agent mode: construct `create_plan` and `suggest_planning_mode` tools via `getPlanningTools()` and append to `staticTools`, gated on `experimentalFeatures.planning`

## 6. Server — Planning Tools (factory pattern)

- [ ] 6.1 Create `getPlanningTools()` factory function that takes `{ eventEmitter: AgentEventEmitterFn, planState: { current: Plan | undefined }, agentMode: AgentMode, toolProvider: ToolProvider }` and returns `ExecutableTool[]`
- [ ] 6.2 Implement `create_plan` tool within factory: input schema (title, description?, action_items[] with related_skills/related_tools), `maxItems: 50` validation, handler creates plan with `source`/`status` based on `agentMode` (planning → `draft`/`planning`; agent → `ready`/`agent`), all items start as `status: 'pending'`, stores in `planState.current`, emits `plan_created` event via `eventEmitter()`
- [ ] 6.3 Implement `update_plan` tool within factory: input schema (items?: [{index, status: ActionItemStatus}], plan_status?: PlanStatus), allows any status transition (validate status value only), emits `plan_updated` event
- [ ] 6.4 Implement `list_available_tools` tool within factory: read-only tool that queries `toolProvider` for tool metadata (id, type, description), with optional keyword filter
- [ ] 6.5 Implement `suggest_planning_mode` tool within factory: input `{ reason: string }`, emits `mode_suggestion` event via `eventEmitter()`, returns confirmation string
- [ ] 6.6 All tool handlers use `ToolResultType.error` pattern for errors (matching existing `createErrorResult()` pattern in `run_tool.ts`)

## 7. Server — Event Handling

- [ ] 7.1 Add `plan_created`, `plan_updated`, and `mode_suggestion` to `ChatAgentEvent` union type
- [ ] 7.2 Verify plan and mode suggestion events flow through `convert_graph_events.ts` (they are emitted via `manualEvents$` which merges into `events$` before `addRoundCompleteEvent`; verify they aren't filtered by `evictInternalEvents()`)
- [ ] 7.3 Update `getConversationState()` in `run_chat_agent.ts` (and planning mode equivalent) to include plan state in `ConversationInternalState.plan`
- [ ] 7.4 Verify plan events arrive before `round_complete` (event ordering: `addRoundCompleteEvent` appends only after graph stream completes, which includes all tool calls; plan events flow through `manualEvents$` during tool execution)
- [ ] 7.5 Ensure plan events are captured by `collectAndWriteEvents` for round persistence (they are `ChatEvent` subtypes; verify they aren't excluded)

## 8. Client — Experimental Features & Event Infrastructure

- [ ] 8.1 Create `useExperimentalFeatures()` hook that reads `agentBuilder:experimentalFeatures` UI setting via `core.uiSettings.get(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)`, parses it, and returns `ExperimentalFeatures`
- [ ] 8.2 Expose `ExperimentalFeatures` via `useAgentBuilderContext()` or a dedicated context provider so child components can access `experimentalFeatures.planning`
- [ ] 8.3 Update `useSubscribeToChatEvents` to handle `plan_created`, `plan_updated`, and `mode_suggestion` events using the new type guards (`isPlanCreatedEvent`, `isPlanUpdatedEvent`, `isModeSuggestionEvent`), appended to the existing if-else chain
- [ ] 8.4 Add plan state management in conversation context (store current plan + sidebar expanded state, update on plan events)
- [ ] 8.5 Restore plan state from conversation's `ConversationInternalState` when loading an existing conversation via `useConversation` / `conversationsService.get()`
- [ ] 8.6 Add mode suggestion state management: when `mode_suggestion` event arrives and no plan exists, store it and surface a suggestion banner UI

## 9. Client — Mode Selector UI

- [ ] 9.1 Create `AgentModeSelector` component as a segmented control (`EuiButtonGroup`) near the conversation input area with `[🔧 Agent]` and `[📋 Plan]` options
- [ ] 9.2 Add `agentMode` state to conversation input context (default: `'agent'`)
- [ ] 9.3 Update `ChatService.chat()` to accept and pass `agent_mode` to the converse API call (add to `ChatParams` interface, include in the `converse()` payload JSON)
- [ ] 9.4 Update `useSendMessageMutation` / `sendMessage()` to include `agentMode` when calling `chatService.chat()` (the mutation currently passes `input`, `conversationId`, `agentId`, `connectorId`, `attachments`, `browserApiTools`)
- [ ] 9.5 Conditionally render `AgentModeSelector` based on `experimentalFeatures.planning` from `useExperimentalFeatures()` / `useAgentBuilderContext()`
- [ ] 9.6 Style the mode selector following EUI conventions, disable while round is in progress

## 10. Client — Approval Flow & Mode Suggestion UI

- [ ] 10.1 When user clicks "Approve & Execute" button in plan panel: switch mode selector to `agent`, pre-fill message editor via `messageEditor.setContent('Execute the plan.')` + `messageEditor.focus()` (from `useMessageEditor()`)
- [ ] 10.2 When user toggles mode selector from `planning` → `agent` AND a `ready` plan with `source: 'planning'` exists: pre-fill message editor with "Execute the plan." via `messageEditor.setContent()` + `messageEditor.focus()`
- [ ] 10.3 Handle edge case: user toggles to agent mode with no plan or draft plan (no pre-fill, normal agent behavior)
- [ ] 10.4 Create `ModeSuggestionBanner` component: shown when a `mode_suggestion` event arrives in agent mode, displays the reason and a "Switch to Planning Mode" button
- [ ] 10.5 When user clicks "Switch to Planning Mode" on the suggestion banner: switch mode selector to `planning`, dismiss the banner
- [ ] 10.6 Allow dismissing the suggestion banner without switching modes (user stays in agent mode)
- [ ] 10.7 Mode suggestion only shown when no plan exists; if plan exists, banner is suppressed

## 11. Client — Plan Display Panel (Collapsible Sidebar)

- [ ] 11.1 Modify `Conversation` component layout: wrap existing column layout in a row-based `EuiFlexGroup` to accommodate the sidebar (`<EuiFlexItem grow>` for existing content, `<EuiFlexItem grow={false}>` for sidebar)
- [ ] 11.2 Create `PlanPanel` component as a collapsible right sidebar (using `EuiFlyout` with `type="push"` or custom flex layout) that renders the plan: title, description, progress bar (`EuiProgress`), action items, status badge, and conditional "Approve & Execute" button
- [ ] 11.3 Create `PlanActionItemDisplay` component for individual items (description + granular status indicator + skill/tool badges + click handler for targeted feedback)
- [ ] 11.3b Create skill/tool badge rendering: resolve IDs to display names via skill/tool registries, render as `EuiBadge` with appropriate icons, handle "not found" case gracefully
- [ ] 11.4 Create `PlanStatusBadge` component showing current lifecycle status (Draft / Ready / Executing / Completed); for `source: 'agent'` plans, skip Draft and show "Executing" immediately
- [ ] 11.5 Implement "Approve & Execute" button: visible only when plan `status === 'ready'` AND `source === 'planning'`, clicking calls `messageEditor.setContent('Execute the plan.')` + `messageEditor.focus()` + `setAgentMode('agent')`
- [ ] 11.5b For `source: 'agent'` plans: show plan header as "Agent's Plan" instead of "Plan", no "Approve & Execute" button
- [ ] 11.6 Implement item-level interaction: clicking a plan item calls `messageEditor.setContent("Regarding step {N} ({truncated description}): ")` + `messageEditor.focus()` for targeted feedback
- [ ] 11.7 Implement item status visualization: `pending` (hollow circle), `in_progress` (pulsing/accent indicator, bold text), `completed` (green checkmark, subdued text), `failed` (red X icon)
- [ ] 11.8 Add progress bar (`EuiProgress` with `size="xs"`) in plan panel header showing `completed_count / total_count`
- [ ] 11.9 Auto-expand sidebar when `plan_created` event fires; allow manual collapse/expand
- [ ] 11.10 Support collapsed state: show a small toggle button with progress badge (e.g., "2/5" via `EuiNotificationBadge`) at the edge to re-expand
- [ ] 11.11 Highlight changed items when `plan_updated` fires (brief background color flash: green for `completed`, blue for `in_progress`, red for `failed`; clear after 1.5s)
- [ ] 11.12 Handle edge cases: no plan exists (sidebar hidden), plan replaced (restart approval flow), conversation with plan loaded from history, mode switch mid-execution
- [ ] 11.13 Handle small screens: sidebar defaults to collapsed, toggle button remains visible, plan can be viewed in overlay flyout instead of push layout

## 12. Client — Stretch Goals

- [ ] 12.1 When all plan items are completed, show a "Refine Plan" button that switches to planning mode for iterative workflows
- [ ] 12.2 (Stretch) Keyboard shortcut (Cmd+Shift+P / Ctrl+Shift+P) to toggle between Agent and Planning modes
- [ ] 12.3 (Stretch) Mode badge on conversation rounds: each round header shows a small pill indicating which mode was used (requires adding `agent_mode` to round metadata)

## 13. Tests

- [ ] 13.1 Unit tests for `getPlanningTools()` factory (returns correct tools for planning mode vs agent mode, tools close over eventEmitter and planState)
- [ ] 13.2 Unit tests for `create_plan` tool (valid input with skill/tool refs, invalid input, plan replacement, planning mode → draft status + source planning, agent mode → ready status + source agent, items start as `pending`, max 50 items validation, empty title rejection)
- [ ] 13.3 Unit tests for `update_plan` tool (item status transitions including any-to-any, plan_status draft→ready, invalid index, no existing plan, multiple item updates, `in_progress` → `completed` / `failed`, valid status value enforcement)
- [ ] 13.4 Unit tests for `list_available_tools` tool (list all, keyword filter, empty registry, uses toolProvider)
- [ ] 13.5 Unit tests for `suggest_planning_mode` tool (emits mode_suggestion event via eventEmitter closure, returns confirmation)
- [ ] 13.6 Unit tests for mode routing in `runAgent()` (agent mode, planning mode, invalid mode)
- [ ] 13.7 Unit tests for `selectPlanningTools()` (only planning + discovery tools, respects experimental features)
- [ ] 13.8 Unit tests for agent mode planning tool inclusion (create_plan + suggest_planning_mode appended to staticTools when planning enabled, update_plan added when plan exists)
- [ ] 13.9 Unit tests for plan-aware agent mode (plan context injected when plan exists, `update_plan` available, no plan context when no plan)
- [ ] 13.10 Unit tests for planning system instruction composition (createPlanningPromptFactory implementing PromptFactory, including skill/tool discovery instructions)
- [ ] 13.11 Unit tests for plan execution instruction composition (plan_execution_instructions)
- [ ] 13.12 Unit tests for plan state persistence in `ConversationInternalState` (serialize/deserialize across rounds, status and skill/tool refs preserved)
- [ ] 13.13 Unit tests for feature flag gating (planning mode rejected when disabled, server + client)
- [ ] 13.14 Unit tests for converse route schema validation (`agent_mode` parameter)
- [ ] 13.15 Unit tests for TM path threading (`agentMode` survives serialization/deserialization in `AgentExecutionParams`)
- [ ] 13.16 Unit tests for type guard functions (`isPlanCreatedEvent`, `isPlanUpdatedEvent`, `isModeSuggestionEvent`)
- [ ] 13.17 Unit tests for `useExperimentalFeatures` hook (reads UI setting, parses correctly, exposes planning flag)
- [ ] 13.18 Unit tests for event ordering (plan events arrive before round_complete)
- [ ] 13.19 Unit tests for skill/tool badge rendering (resolve IDs, handle missing, display correctly)
- [ ] 13.20 Unit tests for mode suggestion event handling and banner display/dismiss
- [ ] 13.21 Unit tests for self-planning in agent mode (`create_plan` sets source `'agent'`, status `'ready'`, no approval gate)
- [ ] 13.22 Unit tests for item-level interaction (click calls messageEditor.setContent + focus)
- [ ] 13.23 Unit tests for progress bar (correct completion count, correct color by status)
- [ ] 13.24 Unit tests for collapsed sidebar progress badge
- [ ] 13.25 Unit tests for conversation layout change (row-based flex, sidebar expand/collapse)
- [ ] 13.26 Integration tests for full plan lifecycle (planning mode): discover skills/tools → create plan with refs → refine → mark ready → approve (button click) → execute → complete
- [ ] 13.27 Integration tests for self-planning lifecycle (agent mode): complex request → mode suggestion → user stays → self-plan → execute → complete
- [ ] 13.28 Integration tests for mode switching: planning mode round → agent mode round → verify plan state and execution
- [ ] 13.29 Integration tests for manual mode toggle execution trigger
- [ ] 13.30 Integration tests for mode suggestion: agent suggests planning → user accepts → switches to planning mode
