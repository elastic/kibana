## 🍒 Summary

Add `cached_tokens_used` telemetry field to Streams AI generation tasks. This enables tracking of cached token usage for OpenAI API requests, helping monitor cost savings from prompt caching.

Closes https://github.com/elastic/streams-program/issues/665

## 🛠️ Changes

- **New EBT event**: Added `streams-features-identified` event type for feature identification telemetry (previously had no telemetry)
- **Added `cached_tokens_used` field** to existing EBT events:
  - `streams-description-generated`
  - `streams-system-identification-identified`
  - `streams-significant-events-queries-generated`
- **Updated task definitions** to pass cached token counts:
  - `description_generation.ts` - passes `cached_tokens_used`
  - `system_identification.ts` - passes `cached_tokens_used`
  - `significant_events_queries_generation.ts` - accumulates and passes cached tokens
  - `features_identification.ts` - new telemetry call with full token counts
- **Added unit tests** for telemetry client and schemas verifying `cached_tokens_used` handling

## 🎙️ Prompts

- "Add cached_tokens_used telemetry to Streams AI tasks"
- "Follow the insights_discovery.ts pattern for cached token tracking"

🤖 This pull request was assisted by Cursor
