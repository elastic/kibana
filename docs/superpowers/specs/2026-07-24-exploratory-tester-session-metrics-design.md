# Exploratory Tester Session Metrics Design

**Date:** 2026-07-24

**Parent issue:** [elastic/security-team#18592](https://github.com/elastic/security-team/issues/18592)

## Goal

Provide trustworthy, comparable session metrics for the exploratory-tester skill without changing browser behavior or the evidence and finding-quality safeguards. The implementation must distinguish model token counts from browser/tool payload and artifact byte counts.

## Non-goals

- Intercepting or changing Playwright MCP/browser calls.
- Persisting request or response bodies.
- Estimating tokens from byte counts.
- Changing the five-step exploration checklist, reproduction gates, severity rules, or evidence requirements.
- Replacing the existing human-readable token line consumed by the skill and test-plan-generator.

## Design

### Backward-compatible measurement entry point

Keep `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py` as the shared entry point. Its current one-line output remains unchanged for the existing consumers:

```text
input=N output=N cache_create=N cache_read=N total=N
```

Add an opt-in structured mode for the exploratory tester. The structured mode accepts a versioned, sanitized session manifest. The existing positional transcript path and automatic `CLAUDE_CODE_SESSION_ID` lookup continue to work unchanged.

The manifest may contain:

- A `session_root` and optional `artifact_root`, both resolved under the manifest directory.
- Transcript paths with an explicit `orchestrator` or `worker` scope.
- Artifact paths with an explicit kind: findings, report, screenshot, video, configuration, or detector source.
- Optional numeric payload counters supplied by a future collector: tool-input bytes, tool-output bytes, and browser-event bytes.

Only paths and numeric counters are consumed. The metrics script never reads or stores payload content.
When no manifest is supplied, structured mode may measure the known session outputs under
an explicitly supplied session directory; it never scans arbitrary files.

### Structured output

Structured mode emits a versioned JSON document with:

- Token totals by scope and aggregate, preserving input, output, cache creation, cache read, and total fields.
- Artifact file counts and byte totals by kind.
- Optional payload byte totals, or an explicit `not_available` status when no payload counters were supplied.
- Source metadata identifying which transcript/manifest inputs were used.

Unavailable data is represented explicitly. A missing transcript, missing manifest, unsupported harness, or missing optional payload counters must not become zero-valued usage.

### Session report integration

Phase 3 invokes structured mode when a session manifest is available, keeps the existing token-usage line for compatibility, and adds a separate browser-payload/artifact line. If structured metrics are unavailable, the report says so explicitly.

The report continues to use Markdown findings and evidence as its source of truth. Metrics are bookkeeping only and cannot suppress, merge, reclassify, or downgrade findings.

## Data flow

```text
transcript(s) + optional sanitized manifest
                 |
                 v
       session-token-usage.py
                 |
                 +--> legacy one-line token output
                 |
                 +--> versioned JSON metrics
                              |
                              v
                    Phase 3 report metadata
```

## Error handling and safety

- Malformed JSONL lines and unknown transcript records remain ignorable, as in the current parser.
- Numeric usage values are accepted only when they are finite, non-negative numbers.
- Missing or unreadable paths produce an unavailable source entry rather than a fabricated zero.
- Artifact accounting is based on file metadata and an allowlisted manifest kind; it does not recursively scan arbitrary directories.
- Manifest paths are resolved relative to the manifest location and must remain within the declared session/artifact roots.
- Payload counters are trusted only as measurements; their source and availability are preserved in output.
- The script remains side-effect free.

## Testing

Add focused tests and fixtures covering:

1. Existing top-level and `message.usage` transcript shapes.
2. Multiple scoped transcripts and aggregate totals.
3. Explicit transcript paths taking precedence over automatic lookup.
4. Artifact byte/count aggregation by allowlisted kind.
5. Optional payload counters and explicit unavailable output.
6. Malformed lines, missing files, negative/non-numeric values, and empty usage.
7. Legacy one-line output remaining byte-for-byte compatible.

Run the focused script tests directly, then run the relevant lint/check commands for the changed Markdown and Python files. A seeded report fixture will verify that metrics do not alter finding sections or evidence.
