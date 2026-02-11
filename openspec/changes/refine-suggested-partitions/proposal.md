## Why

The "Suggest partitions with AI" feature currently runs a fully autonomous reasoning loop with no way for users to influence the outcome. Users often have domain knowledge about their data (e.g. "partition by severity level" or "separate by service name") that the LLM could leverage but currently cannot. Additionally, once suggestions are generated, the only option to get different results is to regenerate from scratch — there is no way to iteratively refine suggestions based on feedback.

## What Changes

- Add an optional text input for user guidance/instructions that is passed to the LLM when generating partition suggestions. Users can leave it empty for the current fully-automatic behavior.
- Pass the user guidance through the API to the AI workflow so the LLM considers it alongside sample data when reasoning about partitions.
- After suggestions are generated, allow users to provide additional refinement guidance. The LLM receives both the existing partitions and the new instructions, enabling iterative improvement without starting from scratch.
- Update the AI prompt templates to incorporate user guidance when present.

## Capabilities

### New Capabilities

- `partition-user-guidance`: Ability for users to provide optional natural-language instructions that guide the AI partition suggestion process, both for initial generation and iterative refinement of existing suggestions.

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **UI components**: `child_stream_list.tsx`, `generate_suggestions_button.tsx`, `review_suggestions_form.tsx`, and `use_review_suggestions_form.tsx` in `x-pack/platform/plugins/shared/streams_app/public/components/data_management/stream_detail_routing/`
- **API route**: `POST /internal/streams/{name}/_suggest_partitions` in `x-pack/platform/plugins/shared/streams/server/routes/internal/streams/management/suggest_partitions_route.ts` — request body schema gains optional `user_prompt` and `existing_partitions` fields
- **AI workflow**: `partitionStream` in `x-pack/platform/packages/shared/kbn-streams-ai/workflows/partition_stream/` — prompt construction and function signature updated to accept user guidance and existing partitions
- **AI prompts**: System and content prompt templates in the same package updated to include user guidance context
