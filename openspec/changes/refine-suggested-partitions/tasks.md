## 1. AI Workflow — Extend `partitionStream` and prompts

- [x] 1.1 Add optional `userPrompt?: string` and `existingPartitions?: Array<{ name: string; condition: Condition }>` parameters to the `partitionStream` function signature in `x-pack/platform/packages/shared/kbn-streams-ai/workflows/partition_stream/index.ts`
- [x] 1.2 Add `user_prompt: z.string().optional()` and `existing_partitions: z.string().optional()` to the prompt input schema in `x-pack/platform/packages/shared/kbn-streams-ai/workflows/partition_stream/prompt.ts`
- [x] 1.3 Update the content prompt template (`content_prompt.text`) to conditionally render a "User guidance" section using `{{#user_prompt}}` and a "Current partitions" section using `{{#existing_partitions}}`
- [x] 1.4 Update the system prompt template (`system_prompt.text`) to include a clause about incorporating user guidance and existing partitions when provided
- [x] 1.5 Pass `userPrompt` and serialized `existingPartitions` into the prompt input object within `partitionStream` when the parameters are provided

## 2. API Route — Extend request schema

- [x] 2.1 Add optional `user_prompt: z.string().optional()` and `existing_partitions` (array of `{ name: string, condition: Condition }`) to the `suggestPartitionsSchema` body in `x-pack/platform/plugins/shared/streams/server/routes/internal/streams/management/suggest_partitions_route.ts`
- [x] 2.2 Pass `user_prompt` and `existing_partitions` from the request body through to the `partitionStream` call in the route handler

## 3. UI — Guidance popover component

- [x] 3.1 Create a new `GenerateSuggestionsPopover` component in `x-pack/platform/plugins/shared/streams_app/public/components/data_management/stream_detail_routing/review_suggestions_form/` that renders an `EuiPopover` with an `EuiTextArea` (placeholder: "e.g., Partition by service name and severity level"), a Cancel button, and a Generate button
- [x] 3.2 The popover component accepts an `onGenerate(userPrompt?: string)` callback and an `anchorButton` render prop (or children) for the trigger button, plus `aiFeatures` for connector selection

## 4. UI — Hook and state updates

- [x] 4.1 Extend `FetchSuggestedPartitionsParams` in `use_review_suggestions_form.tsx` with optional `userPrompt?: string` and `existingPartitions?: PartitionSuggestion[]` fields
- [x] 4.2 Update `fetchSuggestions` to pass `user_prompt` and `existing_partitions` in the API request body when provided
- [x] 4.3 Add `userPrompt` local state to `useReviewSuggestionsForm` that persists across regeneration cycles and is cleared on `resetForm`

## 5. UI — Integrate popover into initial generation flow

- [x] 5.1 Replace direct `GenerateSuggestionButton` `onClick` in `child_stream_list.tsx` so that clicking the button opens the `GenerateSuggestionsPopover` instead of immediately triggering generation
- [x] 5.2 Wire the popover's `onGenerate` callback to call `fetchSuggestions` with `streamName`, `connectorId`, `start`, `end`, and the optional `userPrompt`
- [x] 5.3 Update the empty state prompt (`NoDataEmptyPrompt` / `empty_prompt.tsx`) to also use the popover flow

## 6. UI — Integrate popover into refinement flow

- [x] 6.1 Replace the "Regenerate" button in `review_suggestions_form.tsx` with the `GenerateSuggestionsPopover` component
- [x] 6.2 Wire the popover's `onGenerate` callback to call `fetchSuggestions` with `userPrompt` and the current `suggestions` array as `existingPartitions`
