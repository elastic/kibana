## Capability: Plan UI

UI components for the segmented mode selector, the collapsible sidebar plan display panel with approval/execute controls, mode suggestion banner, item-level interaction, and real-time plan update rendering driven by streaming events.

## Mode Selector

### Component: `AgentModeSelector`

A segmented control near the conversation input area that allows the user to switch between `agent` and `planning` mode before sending a message.

**Location**: `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_input/agent_mode_selector.tsx`

**Props**:
```typescript
interface AgentModeSelectorProps {
  mode: AgentMode;
  onChange: (mode: AgentMode) => void;
  disabled?: boolean;
}
```

**Behavior**:
- Renders as `EuiButtonGroup` (segmented control) with two options: `[🔧 Agent]` and `[📋 Plan]`
- Both options are always visible (no dropdown/click to discover)
- Default selection: `'agent'`
- Fires `onChange` when the user selects a different mode
- Conditionally rendered: only visible when `experimentalFeatures.planning` is enabled
- Disabled while a round is in progress (to prevent mode switching during execution)

**Placement**: Inside `ConversationInput`, near the `InputActions` area. The mode selector appears alongside (or above) the message editor, so users can choose the mode before typing their message.

### State Management

```typescript
// In conversation input context or Conversation component state
const [agentMode, setAgentMode] = useState<AgentMode>('agent');
```

The `agentMode` is passed to `ChatService.chat()` when the user sends a message, which includes it as the `agent_mode` field in the converse API request body.

### Feature Flag Integration

The mode selector checks the experimental features flag to determine visibility. Since the client does not currently expose this setting, a new `useExperimentalFeatures()` hook is needed (see agent-modes spec):

```typescript
// In ConversationInput or similar parent
const experimentalFeatures = useExperimentalFeatures();

{experimentalFeatures.planning && (
  <AgentModeSelector mode={agentMode} onChange={handleModeChange} />
)}
```

## Mode Suggestion Banner

### Component: `ModeSuggestionBanner`

A dismissable banner shown when the agent suggests switching to planning mode. Triggered by a `mode_suggestion` streaming event (emitted by the `suggest_planning_mode` tool).

**Location**: `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/mode_suggestion_banner.tsx`

**Props**:
```typescript
interface ModeSuggestionBannerProps {
  reason: string;
  onAccept: () => void;  // User clicks "Switch to Planning Mode"
  onDismiss: () => void; // User dismisses the banner
}
```

**Behavior**:
- Rendered inline in the conversation area (above or near the latest response) when a `mode_suggestion` event is received
- Shows the suggestion reason text (e.g., "This task involves multiple steps that would benefit from upfront planning")
- Two actions: "Switch to Planning Mode" button (primary) and a dismiss/close button
- Clicking "Switch to Planning Mode" → calls `onAccept`, which sets the mode selector to `planning` and dismisses the banner
- Clicking dismiss → calls `onDismiss`, banner disappears, agent continues in agent mode
- Uses EUI components: `EuiCallOut` with `color="primary"` and `iconType="iInCircle"`
- Only one suggestion banner at a time; new `mode_suggestion` events replace the previous one
- The banner does not block the agent's response — it appears alongside the agent's text
- Not shown when a plan already exists (mode suggestion is only relevant when no plan exists)

**Visual example**:
```
┌──────────────────────────────────────────────────────────────┐
│ 💡 This task involves multiple steps that would benefit from │
│    upfront planning. Switch to Planning mode to create a     │
│    detailed plan before execution?                           │
│                                                              │
│    [ Switch to Planning Mode ]              [ ✕ Dismiss ]    │
└──────────────────────────────────────────────────────────────┘
```

### State Management

```typescript
const [modeSuggestion, setModeSuggestion] = useState<ModeSuggestionEventData | null>(null);

// In useSubscribeToChatEvents
case ChatEventType.modeSuggestion:
  setModeSuggestion(event.data);
  break;

// Handler for accept
const handleSuggestionAccept = () => {
  setAgentMode('planning');
  setModeSuggestion(null);
};

// Handler for dismiss
const handleSuggestionDismiss = () => {
  setModeSuggestion(null);
};
```

## Approval Flow (No Auto-Switch)

### Explicit approval only

There is NO auto-mode-switch when the user replies in chat. Replying in planning mode always stays in planning mode, regardless of plan status. This prevents accidental execution.

### "Approve & Execute" button click

When the user clicks "Approve & Execute" in the plan panel:

```typescript
const handleExecutePlan = () => {
  setAgentMode('agent');
  // Pre-fill the message editor using the messageEditor API from useMessageEditor()
  messageEditor.setContent('Execute the plan.');
  messageEditor.focus();
};
```

### Mode toggle with ready plan

When the user manually toggles the mode selector from `planning` → `agent`:

```typescript
const handleModeChange = (newMode: AgentMode) => {
  setAgentMode(newMode);

  // If switching to agent mode with a ready plan (user-initiated), offer to start execution
  if (newMode === 'agent' && plan?.status === 'ready' && plan?.source === 'planning') {
    // Pre-fill the message editor using the messageEditor API from useMessageEditor()
    messageEditor.setContent('Execute the plan.');
    messageEditor.focus();
  }
};
```

Note: The mode toggle handler does not need special handling for agent-sourced plans (`source: 'agent'`), because those plans are created and executed entirely within agent mode.

## Plan Display Panel (Collapsible Sidebar)

### Component: `PlanPanel`

A collapsible right sidebar panel that displays the current plan for the conversation. Updated in real time as `plan_created` and `plan_updated` events arrive. Shows approval/execution controls based on plan status.

**Location**: `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/plan_panel.tsx`

**Props**:
```typescript
interface PlanPanelProps {
  plan: Plan | undefined;
  agentMode: AgentMode;
  isRoundInProgress?: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onExecutePlan: () => void;
  onItemClick: (index: number, description: string) => void;
}
```

**Visual structure**:

For user-initiated plans (`source: 'planning'`):
```
┌────────────────────────────────────────────────────────┐
│ 📋 Plan: {title}                    [Draft] [▼/▲]     │
├────────────────────────────────────────────────────────┤
│ {description}                                          │
│                                                        │
│ ○ 1. Analyze alert patterns from the last 24 hours    │
│      [🎯 Alert triage]  [🔧 platform.search]          │
│ ○ 2. Correlate with infrastructure metrics             │
│      [🎯 Observability log analysis]  [🔧 esql]       │
│ ○ 3. Generate summary report                          │
│      [🔧 esql]                                        │
│                                                        │
│ Progress: 0/3 completed                                │
└────────────────────────────────────────────────────────┘

When status is 'ready':
┌────────────────────────────────────────────────────────┐
│ 📋 Plan: {title}                    [Ready] [▼/▲]     │
├────────────────────────────────────────────────────────┤
│ {description}                                          │
│                                                        │
│ ○ 1. Analyze alert patterns from the last 24 hours    │
│      [🎯 Alert triage]  [🔧 platform.search]          │
│ ○ 2. Correlate with infrastructure metrics             │
│      [🎯 Observability log analysis]  [🔧 esql]       │
│ ○ 3. Generate summary report                          │
│      [🔧 esql]                                        │
│                                                        │
│ Progress: 0/3 completed                                │
│                                                        │
│              [ ▶ Approve & Execute ]                   │
└────────────────────────────────────────────────────────┘

During execution (agent mode with plan):
┌────────────────────────────────────────────────────────┐
│ 📋 Plan: {title}                 [Executing] [▼/▲]    │
├────────────────────────────────────────────────────────┤
│ ✓ 1. Analyze alert patterns from the last 24 hours    │
│      [🎯 Alert triage]  [🔧 platform.search]          │
│ ◉ 2. Correlate with infrastructure metrics             │
│      [🎯 Observability log analysis]  [🔧 esql]       │
│ ○ 3. Generate summary report                          │
│      [🔧 esql]                                        │
│                                                        │
│ Progress: 1/3 completed                                │
└────────────────────────────────────────────────────────┘

When all completed:
┌────────────────────────────────────────────────────────┐
│ 📋 Plan: {title}              [Completed ✓] [▼/▲]     │
├────────────────────────────────────────────────────────┤
│ ✓ 1. Analyze alert patterns from the last 24 hours    │
│      [🎯 Alert triage]  [🔧 platform.search]          │
│ ✓ 2. Correlate with infrastructure metrics             │
│      [🎯 Observability log analysis]  [🔧 esql]       │
│ ✓ 3. Generate summary report                          │
│      [🔧 esql]                                        │
│                                                        │
│ Progress: 3/3 completed                                │
│                                                        │
│              [ 🔄 Refine Plan ]  (stretch goal)        │
└────────────────────────────────────────────────────────┘
```

For self-planned plans (`source: 'agent'`), the header shows "Agent's Plan" and there is no Draft state or Approve button:
```
┌────────────────────────────────────────────────────────┐
│ 🤖 Agent's Plan: {title}        [Executing] [▼/▲]     │
├────────────────────────────────────────────────────────┤
│ {description}                                          │
│                                                        │
│ ✓ 1. Analyze alert patterns from the last 24 hours    │
│      [🎯 Alert triage]  [🔧 platform.search]          │
│ ◉ 2. Correlate with infrastructure metrics             │
│      [🎯 Observability log analysis]  [🔧 esql]       │
│ ○ 3. Generate summary report                          │
│      [🔧 esql]                                        │
│                                                        │
│ Progress: 1/3 completed                                │
└────────────────────────────────────────────────────────┘
```

### Sidebar behavior

- **Hidden**: No plan exists — sidebar not rendered
- **Auto-expand**: When `plan_created` event fires and sidebar is hidden, it auto-expands
- **Expanded**: Plan exists — sidebar shows plan panel alongside the conversation
- **Collapsed**: User collapses sidebar — a small toggle button with a **progress badge** (e.g., "2/5" via `EuiNotificationBadge`) remains visible at the edge to re-expand, giving at-a-glance completion status
- The conversation area adjusts its width when the sidebar expands/collapses
- **Small screens**: Sidebar defaults to collapsed; can use overlay flyout instead of push layout

Implementation options:
- `EuiFlyout` with `type="push"` (pushes content instead of overlaying)
- `EuiCollapsibleNav` pattern
- Custom CSS grid/flex layout with animated width transition

### Progress Bar

A horizontal `EuiProgress` bar in the plan panel header shows overall completion:

```typescript
const completedCount = plan.action_items.filter(i => i.status === 'completed').length;
const totalCount = plan.action_items.length;
const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
const allComplete = completedCount === totalCount;

<EuiProgress
  value={completedCount}
  max={totalCount}
  size="xs"
  color={allComplete ? 'success' : 'accent'}
/>
<EuiText size="xs" color="subdued">
  {completedCount}/{totalCount} completed
</EuiText>
```

### Component: `PlanStatusBadge`

Displays the plan's current lifecycle status as a colored badge.

**Location**: `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/plan_status_badge.tsx`

**Props**:
```typescript
interface PlanStatusBadgeProps {
  plan: Plan;
  agentMode: AgentMode;
  isRoundInProgress?: boolean;
}
```

**Status derivation** (UI-only, not stored):

| Plan `status` | Plan `source` | Agent Mode | Items | Display |
|---------------|--------------|-----------|-------|---------|
| `draft` | `planning` | Any | Any | "Draft" (subdued) |
| `ready` | `planning` | `planning` | Any | "Ready" (primary) |
| `ready` | `planning` | `agent` | Some not completed | "Executing" (accent) |
| `ready` | `planning` | `agent` | All completed | "Completed" (success) |
| `ready` | `agent` | `agent` | Some not completed | "Executing" (accent) |
| `ready` | `agent` | `agent` | All completed | "Completed" (success) |

Note: For `source: 'agent'` plans, the "Draft" and "Ready" states are never displayed to the user. The plan transitions directly from creation to "Executing".

### Component: `PlanActionItemDisplay`

Individual action item row within the plan panel, including granular status, skill/tool badges, and click interaction.

**Location**: `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/plan_action_item_display.tsx`

**Props**:
```typescript
interface PlanActionItemDisplayProps {
  index: number;
  description: string;
  status: ActionItemStatus;
  relatedSkills?: string[];
  relatedTools?: string[];
  onClick: (index: number, description: string) => void;
}
```

**Status visualization**:
- `pending`: Hollow circle (○), normal text weight and color
- `in_progress`: Pulsing/accent filled circle (◉), bold text, accent color
- `completed`: Green checkmark (✓), subdued text, optional light strikethrough
- `failed`: Red X icon (✕), subdued text, red tint

**Rendering**:
- Index displayed as a 1-based number
- Description text, styled based on status
- **Clickable**: Clicking the item calls `onClick(index, description)`, which pre-fills the chat input with `"Regarding step {index + 1} ({description}): "` for targeted feedback
- Cursor indicates clickability (pointer)
- **Skill/tool badges**: Below the description, renders a row of `EuiBadge` components for each referenced skill and tool:
  - Skill badges: colored with a "skill" icon (e.g. `EuiBadge` with `color="hollow"` and skill icon), showing the skill name (resolved from ID via skill registry, falling back to ID if not found)
  - Tool badges: colored with a "tool" icon (e.g. `EuiBadge` with `color="default"` and wrench icon), showing the tool name (resolved from ID via tool registry, falling back to ID if not found)
  - If a referenced skill/tool no longer exists, the badge shows with a subdued "not found" styling
  - Badges are interactive: clicking a skill/tool badge shows a tooltip with the full description (stretch goal for v1)

**Visual example**:
```
○ 1. Analyze alert patterns from the last 24 hours
     [🎯 Alert triage]  [🔧 platform.search]  [🔧 esql]

✓ 2. Correlate with infrastructure metrics
     [🎯 Observability log analysis]  [🔧 platform.search]
```

### "Approve & Execute" Button

Visible when:
- `plan.status === 'ready'`
- `plan.source === 'planning'` (not shown for self-planned plans)
- `agentMode === 'planning'` (or more generally: not currently executing)
- No round is in progress

**Behavior**: Clicking "Approve & Execute" calls `onExecutePlan()` which:
1. Switches `agentMode` to `'agent'`
2. Pre-fills the message editor with "Execute the plan." (user can customize before sending)

### Placement in Layout

**Layout change required**: The current `Conversation` component uses a single-column `EuiFlexGroup`. Adding a sidebar requires wrapping this in a row-based layout:

```typescript
// conversation.tsx — BEFORE (current)
<EuiFlexGroup direction="column" alignItems="center">
  <EuiFlexItem grow>
    <ConversationRounds />
  </EuiFlexItem>
  <EuiFlexItem grow={false}>
    <ConversationInput />
  </EuiFlexItem>
</EuiFlexGroup>

// conversation.tsx — AFTER (with sidebar)
<EuiFlexGroup direction="row" gutterSize="none">
  <EuiFlexItem grow>
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem grow>
        <ConversationRounds />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationInput />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
  {plan && (
    <EuiFlexItem grow={false} css={{ width: isPlanExpanded ? 360 : 40, transition: 'width 200ms' }}>
      {isPlanExpanded ? (
        <PlanPanel
          plan={plan}
          agentMode={agentMode}
          isRoundInProgress={isLoading}
          isExpanded={isPlanExpanded}
          onToggleExpanded={() => setIsPlanExpanded(!isPlanExpanded)}
          onExecutePlan={handleExecutePlan}
          onItemClick={handlePlanItemClick}
        />
      ) : (
        <CollapsedPlanToggle
          completedCount={completedCount}
          totalCount={totalCount}
          onClick={() => setIsPlanExpanded(true)}
        />
      )}
    </EuiFlexItem>
  )}
</EuiFlexGroup>
```

This is a non-trivial layout change. The `EuiFlyout` with `type="push"` is an alternative that avoids restructuring the flex layout (it pushes content automatically). The choice between flex layout vs flyout should be evaluated during implementation based on how it interacts with the existing scroll behavior and responsive breakpoints.

## Item-Level Interaction

Clicking a plan item pre-fills the chat input with a reference to that step using the `messageEditor` API from `useMessageEditor()`:

```typescript
const handlePlanItemClick = (index: number, description: string) => {
  const truncatedDescription = description.length > 50
    ? description.substring(0, 50) + '...'
    : description;
  // messageEditor from useMessageEditor() exposes setContent and focus
  messageEditor.setContent(`Regarding step ${index + 1} (${truncatedDescription}): `);
  messageEditor.focus();
};
```

Note: The `messageEditor` instance is obtained from `useMessageEditor()` inside `ConversationInput`. The `handlePlanItemClick` callback needs access to this instance, either by lifting it to the `Conversation` component's context or by exposing `setContent`/`focus` via a ref or callback prop.

This works in both modes:
- **Planning mode**: User gives feedback on a specific step → agent refines that part of the plan
- **Agent mode**: User asks about a specific in-progress or completed step → agent responds with context

## Update Highlighting

When `plan_updated` fires, briefly highlight items whose status changed:

```typescript
// Track previous plan to detect changes
const prevPlanRef = useRef<Plan | undefined>(plan);

useEffect(() => {
  if (prevPlanRef.current && plan) {
    const changedIndices = plan.action_items
      .map((item, i) => (item.status !== prevPlanRef.current?.action_items[i]?.status ? i : -1))
      .filter(i => i >= 0);
    setHighlightedIndices(changedIndices);
    // Clear highlights after animation
    setTimeout(() => setHighlightedIndices([]), 1500);
  }
  prevPlanRef.current = plan;
}, [plan]);
```

Highlighted items get a brief background color flash (e.g., subtle green for `completed`, subtle blue for `in_progress`, subtle red for `failed`).

## Event Handling

### `useSubscribeToChatEvents` updates

The event subscription hook is updated to handle plan events using the new type guard functions (appended to the existing if-else chain in `nextChatEvent`):

```typescript
// use_subscribe_to_chat_events.ts (appended to existing if-else chain)
} else if (isPlanCreatedEvent(event)) {
  setPlan(event.data.plan);
  setIsPlanExpanded(true); // Auto-expand sidebar
} else if (isPlanUpdatedEvent(event)) {
  setPlan(event.data.plan);
} else if (isModeSuggestionEvent(event)) {
  // Only show if no plan exists
  if (!plan) {
    setModeSuggestion(event.data);
  }
}
```

The type guards (`isPlanCreatedEvent`, `isPlanUpdatedEvent`, `isModeSuggestionEvent`) are defined in `@kbn/agent-builder-common` following the existing pattern (e.g., `isMessageChunkEvent`).

### Plan state in conversation context

A new `plan` state is managed at the conversation level:

```typescript
const [plan, setPlan] = useState<Plan | undefined>(undefined);
const [isPlanExpanded, setIsPlanExpanded] = useState(false);
```

**Initialization**: When loading an existing conversation, the plan is restored from `conversation.state?.plan`:

```typescript
useEffect(() => {
  if (conversation?.state?.plan) {
    setPlan(conversation.state.plan);
    setIsPlanExpanded(true);
  }
}, [conversation]);
```

**Lifetime**: The plan state persists for the entire conversation view. It is updated by streaming events during active rounds and restored from conversation state when loading history.

## Edge Cases

### No plan exists
- Sidebar is hidden
- Mode selector still works; user can be in planning mode without a plan (the agent will create one)

### Plan replaced
- When `plan_created` fires while a plan already exists, the old plan is fully replaced
- The new plan starts as `draft` (if in planning mode) — the approval flow restarts
- Sidebar stays expanded, content transitions to new plan

### Conversation loaded from history
- Plan is read from `conversation.state?.plan`
- The sidebar shows the plan in its last-known state (some items may be completed, status may be ready)
- If the user continues the conversation in agent mode and a plan exists, the agent resumes execution

### User switches back to planning mode during execution
- The sidebar remains visible (plan is in conversation state)
- The agent in planning mode can discuss the plan but not execute further (no execution tools)
- The user can refine the plan (the agent has `create_plan` and `update_plan`)
- To resume execution, the user switches back to agent mode

### All items completed
- The sidebar shows "Completed" status badge
- No "Approve & Execute" button
- "Refine Plan" button shown (stretch goal — switches back to planning mode)
- The plan remains visible for reference
- User can continue chatting in agent mode normally

### Agent self-plans (source: 'agent')
- The sidebar appears with header "Agent's Plan" instead of "Plan"
- No "Draft" state visible — plan immediately shows as "Executing"
- No "Approve & Execute" button — agent proceeds without approval
- Progress tracking works the same as user-approved plans
- If the user switches to planning mode during self-plan execution, the self-planned plan is still visible but the agent can create a new user-initiated plan (which would replace it)

### Mode suggestion while plan exists
- If a plan already exists (from a previous round), the mode suggestion banner is not shown — the agent should work on the existing plan
- Mode suggestion is only relevant when no plan exists

### Draft plan in agent mode
- If the user manually toggles to agent mode while the plan is still `draft`, agent mode behaves normally (with plan context but the plan may not be fully formed)
- The agent will still see the draft plan in its prompt and may reference it
- No pre-fill is triggered (pre-fill only on `ready` plans)

### Streaming in progress
- While the agent is running, plan events may arrive at any time
- The sidebar updates in real time with status changes and highlighting
- The mode selector is disabled during execution to prevent mid-round mode switching

### Small screens / narrow viewports
- Sidebar defaults to collapsed
- Toggle button with progress badge remains visible at the edge
- Plan can be viewed in a flyout overlay instead of push layout

## Stretch Goals

### Keyboard shortcut for mode toggle
Register `Cmd+Shift+P` / `Ctrl+Shift+P` to toggle between Agent and Planning modes. Use EUI's keyboard shortcut handling. This is a power-user feature.

### Mode badge on conversation rounds
Each conversation round header could show a small pill indicating which mode was used (e.g., "Planning" or "Agent"). This requires adding `agent_mode` to the round metadata persisted with each round.

## Files Affected

| File | Change |
|------|--------|
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_input/agent_mode_selector.tsx` | New: segmented mode selector component |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/mode_suggestion_banner.tsx` | New: mode suggestion banner component |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_input/conversation_input.tsx` | Integrate `AgentModeSelector`, pass `agentMode` to send handler |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/plan_panel.tsx` | New: plan display sidebar panel with approval controls and item interaction |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/plan_action_item_display.tsx` | New: individual action item display with granular status and click handler |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/plan_status_badge.tsx` | New: plan lifecycle status badge |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/plan_panel/index.ts` | New: barrel export |
| `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation.tsx` | **Layout change**: wrap existing column in row-based flex, integrate sidebar, `handleExecutePlan` callback, `handlePlanItemClick`, sidebar expand state |
| `x-pack/platform/plugins/shared/agent_builder/public/application/context/send_message/use_subscribe_to_chat_events.ts` | Handle `plan_created`, `plan_updated`, `mode_suggestion` events |
| `x-pack/platform/plugins/shared/agent_builder/public/services/chat/chat_service.ts` | Add `agent_mode` to `ChatParams`, `BaseConverseParams`, pass in converse API request |
| `x-pack/platform/plugins/shared/agent_builder/public/application/context/send_message/send_message_context.ts` | Thread `agentMode` through `sendMessage` |
| `x-pack/platform/plugins/shared/agent_builder/public/application/hooks/use_experimental_features.ts` | New: hook to read `agentBuilder:experimentalFeatures` UI setting client-side |
| `x-pack/platform/plugins/shared/agent_builder/public/application/context/` | Expose experimental features and plan state to components |
