## 1. Scoring and Analysis Utilities

- [x] 1.1 Create `server/tools/advisory/scoring.ts` with health scoring heuristic functions: `scoreQuality(degradedPct, failedPct)`, `scoreSchema(mappedCount, unmappedCount)`, `scoreRetention(lifecycleType)`, `scoreFailureStore(status, failedDocs)`, `scoreProcessing(hasProcessors, unmappedRatio)` — each returning `'healthy' | 'warning' | 'critical'`
- [x] 1.2 Create `server/tools/advisory/issues.ts` with `createIssue(category, severity, summary, recommendation, details)` helper and `sortIssuesBySeverity(issues)` function
- [x] 1.3 Create `server/tools/advisory/extract_results.ts` with helper functions to extract typed data from `RunToolReturn` results (handle both success `ToolResultType.other` and error `ToolResultType.error` responses from sub-tool invocations)
- [ ] ~~1.4 Add unit tests for scoring functions~~ (skipped — POC, no tests)

## 2. Assess Stream Health Tool

- [x] 2.1 Create `server/tools/advisory/assess_stream_health.ts` with Zod schema (required: `name`), tool description with advisory routing cues, and handler skeleton using `toolProvider` pattern
- [x] 2.2 Implement sub-tool invocation: use `context.toolProvider.get()` to obtain `streams.get_data_quality`, `streams.get_schema`, `streams.get_lifecycle_stats`, and `streams.get_stream`, execute all four in parallel via `Promise.all`
- [x] 2.3 Implement analysis logic: extract results from sub-tool responses, apply scoring heuristics from 1.1, build issues array, compute overall health grade, assemble structured result with `overallHealth`, `issues`, and `metrics`
- [x] 2.4 Implement graceful degradation: if a sub-tool returns an error, include a note in the response about the failed dimension but still return results from successful sub-tools
- [ ] ~~2.5 Add unit tests for `assess_stream_health`~~ (skipped — POC, no tests)

## 3. Diagnose Data Quality Tool

- [x] 3.1 Create `server/tools/advisory/diagnose_data_quality.ts` with Zod schema (required: `name`), tool description with quality troubleshooting routing cues, and handler skeleton using `toolProvider` pattern
- [x] 3.2 Implement sub-tool invocation: use `context.toolProvider.get()` to obtain `streams.get_data_quality`, `streams.get_schema`, and `streams.get_stream`, execute all three in parallel via `Promise.all`
- [x] 3.3 Implement root-cause correlation logic: compare unmapped field ratio with degraded %, check failure store status against failed doc count, check processor presence against unmapped fields — produce `rootCauses` array with `cause`, `evidence`, `fix`, and `fixTool`
- [ ] ~~3.4 Add unit tests for `diagnose_data_quality`~~ (skipped — POC, no tests)

## 4. Cross-Stream Overview Tool

- [x] 4.1 Create `server/tools/advisory/overview_streams.ts` with Zod schema (no required params), tool description with overview/recommendation routing cues, and handler skeleton using `toolProvider` pattern
- [x] 4.2 Implement stream discovery: invoke `streams.list_streams` via `toolProvider`, cap at 50 streams, set `truncated` flag if capped
- [x] 4.3 Implement parallel per-stream assessment: for each stream (up to 50), invoke `streams.get_data_quality` and `streams.get_lifecycle_stats` via `toolProvider` in parallel using `Promise.all`
- [x] 4.4 Implement prioritization logic: aggregate per-stream issues, rank `topIssues` by severity and scale (critical on high-volume streams first), assemble structured result with `totalStreams`, `assessedStreams`, `truncated`, `streams`, and `topIssues`
- [ ] ~~4.5 Add unit tests for `overview_streams`~~ (skipped — POC, no tests)

## 5. Tool Registration

- [x] 5.1 Export tool IDs and factory functions from each advisory tool file
- [x] 5.2 Add `STREAMS_ADVISORY_TOOL_IDS` array in `register_tools.ts` containing the three new tool IDs
- [x] 5.3 Add advisory tool IDs to `STREAMS_AGENT_TOOL_IDS` export
- [x] 5.4 Add `createAssessStreamHealthTool`, `createDiagnoseDataQualityTool`, and `createOverviewStreamsTool` calls to the `registerTools` function
- [x] 5.5 Add the three new tool IDs to the agent builder allow list

## 6. System Prompt — Advisory Knowledge

- [x] 6.1 Add `<health_assessment>` section to `getStreamsAgentInstructions()` with intent triggers, action (call `assess_stream_health`), and interpretation guidance (prioritize critical, suggest fixes, offer to execute)
- [x] 6.2 Add `<quality_troubleshooting>` section with intent triggers, action (call `diagnose_data_quality`), interpretation guidance (explain root causes, map to fix tools, offer preview-confirm-apply)
- [x] 6.3 Add `<stream_overview>` section with intent triggers, action (call `overview_streams`), interpretation guidance (rank by urgency, highlight top issues, offer to drill in, handle truncation)
- [x] 6.4 Add `<onboarding_guidance>` section with intent triggers, action (call `assess_stream_health` first), three-phase sequence (understand → organize → optimize), and adaptive skip logic
- [x] 6.5 Add `<retention_best_practices>` section with retention periods by data type, retention type guidance (DSL vs ILM vs inherited), tiering strategies, cost implications
- [x] 6.6 Add formatting guidance for assessment results to the existing `<response_formatting>` section: health grade header + issue list, numbered root causes, ranked stream table

## 7. System Prompt — Tool Selection Update

- [x] 7.1 Update the existing `<tool_selection>` section in `getStreamsAgentInstructions()` to add advisory intent detection routing: advisory questions → composite tools, with specific patterns listed per tool
- [x] 7.2 Add explicit guidance that the agent SHALL NOT fall back to individual read tools for advisory questions when a composite tool is designed for that intent

## 8. Type Safety Verification

- [x] 8.1 Run `yarn test:type_check --project` against the `streams_agent` plugin tsconfig and fix any type errors — relaxed `extractToolResult<T>` constraint from `T extends Record<string, unknown>` to `T` to support TypeScript interfaces without index signatures
- [x] 8.2 Verified that `extract_results.ts` helper functions use proper types from `RunToolReturn`, `ToolResult`, and `ToolResultType` from `@kbn/agent-builder-common`
- [x] 8.3 Verified type check passes for both `streams_agent` and `agent-builder-server` packages
