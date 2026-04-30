---
name: validate-oas
description: Use when you need a quick VALID or NOT VALID result for a scoped Kibana OAS area, and first ensure the generated `oas_docs` inputs are up to date so validation runs against the current environment rather than stale snapshots.
user-invocable: true
disable-model-invocation: true
---

# Validate OAS

## Overview

Use `node ./scripts/validate_oas_docs.js` for a fast pass/fail check of a specific API area.

This skill is intentionally minimal:
- Return only `VALID` or `NOT VALID`.
- If `NOT VALID`, mention the `debug-oas` skill for detailed issue debugging.
- Use this skill first for quick pass/fail.
- Hand off to `debug-oas` when the developer wants issue categorization or examples.

Before validating, make sure the generated OAS artifacts in `oas_docs` are current. Treat stale generated files as an environment/setup problem, not a validation result.

## Environment setup

Refresh the generated OAS inputs before validation when:
- the developer asks for a fresh or CI-like validation run
- `oas_docs` may be stale after switching branches or pulling changes
- scoped validation gives surprising results that may come from outdated generated files

Do not refresh first when:
- the developer explicitly wants a fast local re-check only
- the developer already refreshed `oas_docs` in this session and no relevant inputs changed since then

Refresh flow:

1. Bootstrap dependencies if needed:

```bash
yarn kbn bootstrap
```

2. Regenerate captured OAS snapshots using the same include paths as Buildkite:

```bash
node scripts/capture_oas_snapshot \
  --include-path /api/status \
  --include-path /api/alerting/rule/ \
  --include-path /api/alerting/rules \
  --include-path /api/actions \
  --include-path /api/security/role \
  --include-path /api/spaces \
  --include-path /api/streams \
  --include-path /api/fleet \
  --include-path /api/saved_objects \
  --include-path /api/maintenance_window \
  --include-path /api/agent_builder \
  --include-path /api/workflows \
  --include-path /api/security/entity_store
```

3. Rebuild the final OAS documents:

```bash
cd oas_docs && make api-docs
```

After this refresh flow completes, run the scoped validation command.

Source of truth:
- Keep the `capture_oas_snapshot` include-path list aligned with `.buildkite/scripts/steps/checks/capture_oas_snapshot.sh`.
- If the Buildkite command changes, update this skill to match it.

## Required interaction flow

1. Ask what APIs the developer is working on.
2. Ask for one or more HTTP API paths (for example `/api/fleet/agent_policies`).
3. Ensure `oas_docs` is up to date first when needed by following the environment setup flow above.
4. Run validation using those route-style `--path` filters with `--only traditional` by default and always include `--skip-printing-issues`.
5. Return only:
   - `VALID`, or
   - `NOT VALID` (and mention `debug-oas` for details).

Do not skip questions (1) and (2) unless the developer already provided the API paths.

## Path format

Use normal route-style API paths for `--path`:
- `/api/fleet/agent_policies`
- `/api/fleet/agent_policies/{agentPolicyId}`

Do not manually convert to JSON pointers. The CLI handles conversion for error filtering internally.

## Commands

Environment refresh:

```bash
yarn kbn bootstrap
node scripts/capture_oas_snapshot \
  --include-path /api/status \
  --include-path /api/alerting/rule/ \
  --include-path /api/alerting/rules \
  --include-path /api/actions \
  --include-path /api/security/role \
  --include-path /api/spaces \
  --include-path /api/streams \
  --include-path /api/fleet \
  --include-path /api/saved_objects \
  --include-path /api/maintenance_window \
  --include-path /api/agent_builder \
  --include-path /api/workflows \
  --include-path /api/security/entity_store
cd oas_docs && make api-docs
```

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

Default scoping note:
- Prefer `--only traditional` by default because it matches the common local debugging path and keeps output narrower.
- Use `--only serverless` only when the developer explicitly asks for it.

## Result rules

- Determine status from CLI output:
  - `Found 0 errors in ...` -> `VALID`
  - `Found N errors in ...` where `N > 0` -> `NOT VALID`
- If validation was run without first refreshing obviously stale `oas_docs`, note that the result may reflect outdated generated inputs and refresh before concluding the spec is clean or broken.
- If CLI output indicates no matched paths (for example `None of the provided --path filters matched any content`), keep status as `VALID` but include an explicit warning.
- Output must stay concise:
  - `VALID`
  - `VALID (WARNING: no actual paths were matched.)`
  - `NOT VALID. Use the debug-oas skill for detailed issues.`

## Output template

Use exactly one of these responses:

```text
VALID
```

```text
VALID (WARNING: no actual paths were matched.)
```

```text
NOT VALID. Use the debug-oas skill for detailed issues.
```
