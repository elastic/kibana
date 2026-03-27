---
name: debug-oas
description: Use when debugging OpenAPI (OAS) issues for a specific API area in Kibana by scoping validation output with one or more --path filters, then separating structural invalid-OAS failures from quality or documentation gaps such as missing descriptions.
user-invocable: true
disable-model-invocation: true
---

# Debug OAS

## Overview

Use `node ./scripts/validate_oas_docs.js` to validate Kibana OAS, but always scope output with `--path` so developers can focus on the API area they are actively changing.

The validator can surface two broad categories of issues:
- `structural`: invalid OAS problems that usually block correctness, such as schema violations, invalid shapes, unresolved references, or mismatches between path definitions and the spec structure.
- `quality`: documentation completeness problems such as missing `description`, `summary`, `example`, or `examples`.

When reporting results, always separate these categories. Lead with structural issues first.

## Required interaction flow

1. Ask what APIs the developer is working on.
2. Ask for one or more HTTP API paths (for example `/api/fleet/agent_policies`).
3. Run validation with those route-style `--path` filters.
4. Classify the resulting issues into `structural` vs `quality`.
5. Display the command output directly so the developer can see current issues.

Do not skip questions (1) and (2) unless the developer already provided the API paths.

## Path format guidance

Use normal route-style API paths for `--path` (human-readable):
- `/api/fleet/agent_policies`
- `/internal/fleet/outputs`

Do not manually convert to JSON pointers. The CLI handles conversion for error filtering internally.

Multiple path filters are supported:

```bash
node ./scripts/validate_oas_docs.js \
  --path /api/fleet/agent_policies \
  --path /internal/fleet/outputs
```

## Commands

Default scoped validation:

```bash
node ./scripts/validate_oas_docs.js --only traditional --path <api_route_prefix>
```

Scope to one offering when requested:

```bash
node ./scripts/validate_oas_docs.js --only traditional --path <api_route_prefix>
node ./scripts/validate_oas_docs.js --only serverless --path <api_route_prefix>
```

Default behavior:
- Unless the developer asks otherwise, always include `--only traditional` so validation runs against a single OAS output file.

Optional structural-only summary when the raw output is noisy:

```bash
node ./scripts/validate_oas_docs.js --only traditional --path <api_route_prefix> 2>&1 \
  | node .agents/skills/debug-oas/scripts/extract_structural_oas_issues.js
```

If the developer wants to keep documentation issues in that helper output:

```bash
node ./scripts/validate_oas_docs.js --only traditional --path <api_route_prefix> 2>&1 \
  | node .agents/skills/debug-oas/scripts/extract_structural_oas_issues.js --include-docs
```

Only use the helper summary as a supplement. Keep the raw validator output available for exact debugging.

## Issue categorization

Classify issues using these defaults:

- `quality`:
  - missing `description`
  - missing `summary`
  - missing `example`
  - missing `examples`
- `structural`:
  - everything else by default
  - examples include invalid schemas, type mismatches, missing required non-doc fields, invalid parameter definitions, unresolved refs, or malformed response/request structures

Heuristic:
- If the message is a docs-completeness complaint about `description`, `summary`, `example`, or `examples`, treat it as `quality`.
- Otherwise treat it as `structural` unless the developer explicitly asks for a finer split.

Severity guidance:
- `structural` = blocking invalid OAS
- `quality` = docs completeness or polish problems

If a run mixes both categories, report structural counts first, then quality counts.

## Output behavior

- Use the CLI line `Found N errors in ...` as the source of truth for issue count.
- If the run has 25 or fewer issues, show the exact CLI output with no summarization.
- If the run has more than 25 issues, summarize key patterns and suggest a narrower `--path` scope.
- When summarizing, include:
  - structural issue count
  - quality issue count
  - a few issues copied verbatim from CLI output, ideally one sample per dominant category
- When summarizing, use language like:
  - `Structural issues (invalid OAS): ...`
  - `Quality issues (docs gaps): ...`
- Prefer full issue output (do not use `--skip-printing-issues`) when debugging.
- If no issues are shown for the selected path, suggest widening or adjusting the `--path` prefix.
- If only quality issues remain, say that explicitly so the developer knows the remaining work is documentation-oriented rather than structural.
