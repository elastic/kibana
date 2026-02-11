## Context

The Streams Partitioning UI lets users split an ingest stream into child streams using routing conditions. The "Suggest partitions with AI" button triggers a fully autonomous AI reasoning loop (`partitionStream` in `kbn-streams-ai`) that clusters sample documents and proposes partition conditions. Currently no user input is accepted — the LLM works solely from sample data. The only way to get different results is to regenerate from scratch via the "Regenerate" button, which discards all prior suggestions.

### Current flow

1. User clicks "Suggest partitions with AI" → selects a connector.
2. `fetchSuggestions` calls `POST /internal/streams/{name}/_suggest_partitions` with `connector_id`, `start`, `end`.
3. Server calls `partitionStream` which clusters logs, then runs the LLM with a system prompt, content prompt (stream name, description, initial clustering), and a `partition_logs` tool.
4. Results come back as `PartitionSuggestion[]` displayed in `ReviewSuggestionsForm`.
5. User can accept, reject, edit, or preview each suggestion individually. "Regenerate" starts from scratch.

## Goals / Non-Goals

**Goals:**
- Allow users to optionally provide natural-language guidance before generating partition suggestions (e.g., "partition by severity level", "separate by service name").
- Allow users to iteratively refine existing suggestions by providing additional guidance, without losing already-generated partitions.
- Preserve the current fully-automatic behavior when no guidance is provided.

**Non-Goals:**
- Per-partition refinement instructions (e.g., "make this condition stricter") — users can already manually edit individual conditions.
- Chat-style multi-turn conversation history — only the most recent guidance plus current partitions are sent.
- Changes to the connector selection flow or the suggestion accept/reject/edit UX.

## Decisions

### 1. Reuse the existing API endpoint

**Decision**: Extend `POST /internal/streams/{name}/_suggest_partitions` with two optional body fields rather than creating a separate refinement endpoint.

**Rationale**: The operation is fundamentally the same — generate partition suggestions for a stream. Adding optional `user_prompt` and `existing_partitions` fields keeps the API surface small and avoids duplicating route logic. The server can branch behavior based on whether `existing_partitions` is present (initial generation vs. refinement).

**Alternatives considered**:
- Separate `_refine_partitions` endpoint — rejected because it would duplicate nearly all of the route handler logic (tier check, stream lookup, inference client setup, SSE wrapping).

### 2. Extend the AI workflow function signature

**Decision**: Add optional `userPrompt` and `existingPartitions` parameters to the `partitionStream` function. When present, they are injected into the prompt input and the content prompt template renders them conditionally via Mustache.

**Rationale**: The reasoning agent architecture already supports variable prompt content through Mustache templates. Adding conditional sections is the natural extension point — no new workflow or prompt class is needed.

**Prompt changes**:
- Content prompt gains two conditional blocks:
  - `{{#user_prompt}}` — renders user guidance as a "User guidance" section.
  - `{{#existing_partitions}}` — renders the current partition set as a "Current partitions" section with instructions to refine rather than start fresh.
- System prompt gains a brief clause: when user guidance and/or existing partitions are provided, the model should treat them as primary inputs alongside the clustering data.

### 3. UI: Popover with guidance input

**Decision**: When the user clicks "Suggest partitions with AI" (or "Regenerate"), an `EuiPopover` opens containing an optional text area for user guidance, a Cancel button, and a Generate button. This single popover component is reused for both initial generation and refinement.

**Initial generation flow**:
- Clicking "Suggest partitions with AI" opens the popover anchored to the button.
- The popover contains an optional `EuiTextArea` with placeholder text like *"e.g., Partition by service name and severity level"*.
- Cancel closes the popover without side effects.
- Generate closes the popover, passes the user prompt (if any) alongside the existing parameters, and triggers suggestion generation.
- If the user leaves the text area empty and clicks Generate, the behavior is identical to today's fully-automatic flow.

**Refinement flow**:
- In the `ReviewSuggestionsForm`, clicking "Regenerate" opens the same popover component.
- The popover works identically — optional text area, Cancel, Generate.
- When Generate is clicked during refinement, the current `suggestions` array is sent as `existing_partitions` alongside the new `userPrompt`, so the LLM refines rather than starting from scratch.

**Rationale**: A popover keeps the guidance input contextual and non-intrusive — it only appears when the user explicitly initiates generation. Reusing the same popover component for both initial and refinement flows keeps the UX consistent and reduces code duplication. Cancel provides a clean escape hatch if the user opened the popover accidentally.

### 4. State management for user guidance

**Decision**: Store `userPrompt` as local state in `useReviewSuggestionsForm` (alongside `suggestions` and `isLoadingSuggestions`). The guidance text persists across regeneration cycles within the same session but resets when the user navigates away.

**Rationale**: The guidance is transient — it's relevant only while working on suggestions. No persistence to URL params or server state is needed. Keeping it in the hook that already manages suggestion state avoids prop drilling.

### 5. Existing partitions serialization format

**Decision**: Send `existing_partitions` as an array of `{ name: string, condition: Condition }` objects — the same shape as `PartitionSuggestion` / the `partitionStream` return type.

**Rationale**: Reusing the existing type avoids schema translation. The server can pass the array directly to the prompt template as serialized JSON. The LLM already understands the condition schema from the system prompt.

## Risks / Trade-offs

- **Prompt length increase** → When both user guidance and existing partitions are provided, the content prompt grows. Mitigation: the existing prompt is already compact, and the condition objects are small JSON. The increase should be well within context limits.
- **LLM may ignore guidance** → The model might not always follow user instructions precisely. Mitigation: placing user guidance prominently in the content prompt (before clustering data) gives it high attention weight. This is also inherent to all LLM-based features.
- **Refinement quality** → Providing existing partitions may bias the model toward minimal changes rather than significant restructuring when that's what's needed. Mitigation: the prompt should instruct the model to treat existing partitions as a starting point but not be constrained by them.
- **No conversation history** → Users cannot iteratively refine multiple times with accumulated context. Mitigation: each refinement includes the full current partition set, so the model always sees the latest state. Multi-turn history is a non-goal for this change.
