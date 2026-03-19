---
name: validate-oas
description: Use when you only need a quick VALID or NOT VALID result for a scoped Kibana OAS area, without detailed issue analysis.
user-invocable: true
disable-model-invocation: true
---

# Validate OAS

## Overview

Use `node ./scripts/validate_oas_docs.js` for a fast pass/fail check of a specific API area.

This skill is intentionally minimal:
- Return only `VALID` or `NOT VALID`.
- If `NOT VALID`, mention the `debug-oas` skill for detailed issue debugging.

## Required interaction flow

1. Ask what APIs the developer is working on.
2. Ask for one or more HTTP API paths (for example `/api/fleet/agent_policies`).
3. Run validation using those route-style `--path` filters with `--only traditional` by default and always include `--skip-printing-issues`.
4. Return only:
   - `VALID`, or
   - `NOT VALID` (and mention `debug-oas` for details).

Do not skip questions (1) and (2) unless the developer already provided the API paths.

## Path format

Use normal route-style API paths for `--path`:
- `/api/fleet/agent_policies`
- `/api/fleet/agent_policies/{agentPolicyId}`

Do not manually convert to JSON pointers. The CLI handles conversion for error filtering internally.

## Commands

Default scoped validation:

```bash
node ./scripts/validate_oas_docs.js --only traditional --skip-printing-issues --path <api_route_prefix>
```

Multiple path filters are supported:

```bash
node ./scripts/validate_oas_docs.js --only traditional \
  --skip-printing-issues \
  --path /api/fleet/agent_policies \
  --path /api/fleet/agent_policies/{agentPolicyId}
```

Optional (only when explicitly requested):

```bash
node ./scripts/validate_oas_docs.js --only serverless --skip-printing-issues --path <api_route_prefix>
```

## Result rules

- Determine status from CLI output:
  - `Found 0 errors in ...` -> `VALID`
  - `Found N errors in ...` where `N > 0` -> `NOT VALID`
- If CLI output indicates no matched paths (for example `None of the provided --path filters matched any content`), keep status as `VALID` but include an explicit warning.
- Output must stay concise:
  - `VALID`
  - `VALID (WARNING: no actual paths were matched.)`
  - `NOT VALID. Use the debug-oas skill for detailed issues.`
