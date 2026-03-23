---
name: debug-oas
description: Use when debugging OpenAPI (OAS) issues for a specific API area in Kibana by scoping validation output with one or more --path filters.
user-invocable: true
disable-model-invocation: true
---

# Debug OAS

## Overview

Use `node ./scripts/validate_oas_docs.js` to validate Kibana OAS, but always scope output with `--path` so developers can focus on the API area they are actively changing.

## Required interaction flow

1. Ask what APIs the developer is working on.
2. Ask for one or more HTTP API paths (for example `/api/fleet/agent_policies`).
3. Run validation with those route-style `--path` filters.
4. Display the command output directly so the developer can see current issues.

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

## Output behavior

- Use the CLI line `Found N errors in ...` as the source of truth for issue count.
- If the run has 25 or fewer issues, show the exact CLI output with no summarization.
- If the run has more than 25 issues, summarize key patterns and suggest a narrower `--path` scope.
- When summarizing, include a few issues copied verbatim from CLI output (for example one sample per dominant issue type such as missing `examples` and missing `description`).
- Prefer full issue output (do not use `--skip-printing-issues`) when debugging.
- If no issues are shown for the selected path, suggest widening or adjusting the `--path` prefix.
