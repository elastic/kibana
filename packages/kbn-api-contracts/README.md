# @kbn/api-contracts

Detects breaking changes across Kibana's public REST API surface (including APIs in technical preview), by comparing OpenAPI specs between the PR branch and the base branch using [oasdiff](https://github.com/oasdiff/oasdiff).

## Overview

This package runs in CI on every PR. It compares the current branch's OAS files against the base branch (e.g. `main`) to detect breaking API changes across the whole surface and classifies each by stability tier. Breaking changes in **stable** and **tech_preview** APIs gate the check (fail it); **experimental** breaking changes are reported for visibility only and won't fail the check.

**Flow:**

```
git show base OAS → oasdiff diff → parse → apply allowlist → classify by tier → report → notify
```

By default the check is a soft gate: a BC detected in stable/tech_preview fails the check (non-zero exit) but Buildkite `soft_fail: true` keeps merge unblocked, so the failure is a visible warning. Removing `soft_fail` from `.buildkite/pipelines/pull_request/api_contracts.yml` turns it into a hard merge gate.

**Key components:**

1. **`src/diff/`** - Breaking change detection via oasdiff

   - `run_oasdiff.ts` - Shells out to `oasdiff diff` with two OAS files
   - `parse_oasdiff.ts` - Converts oasdiff JSON output to `BreakingChange[]`
   - `breaking_rules.ts` - Allowlist filtering

2. **`src/stability/`** - Stability-tier classification

   - `parse_x_state.ts` - Parses an OpenAPI `x-state` string into a tier (and optional `since`), tolerant of the casing/spacing variance found in hand-written specs
   - `resolve_tier.ts` - Resolves the tier of a breaking change from the base spec
   - `tiers.ts` - Defines the gating tiers and pins the tier set to the platform route contract (`getXState`) via a compile-time guard

3. **`src/report/`** - Error formatting and user guidance

   - `format_failure.ts` - Generates the tier-grouped CI-log summary (gating tiers first, then an informational experimental section)
   - `write_impact_report.ts` - Writes the JSON impact report consumed by the PR notifier
   - `links.ts` - Documentation and support links

4. **`src/allowlist/`** - Escape hatch for approved breaking changes

   - `load_allowlist.ts` - Loads and validates `allowlist.json`

5. **`src/input/`** - OAS file loading (exported as public API)

   - `load_oas.ts` - Reads and validates OpenAPI spec YAML files

6. **`scripts/`** - CLI entry point
   - `check_contracts.ts` - Orchestrates the full pipeline

## Breaking Change Rules

oasdiff detects these as breaking:

| Change Type                   | oasdiff ID(s)                                                                 | Example                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Path removed**              | `api-path-removed-without-deprecation`                                        | `DELETE /api/spaces/space` removed entirely                                                            |
| **Method removed**            | `api-removed-without-deprecation`, `api-removed-before-sunset`                | `POST` removed from `/api/fleet/agents`                                                                |
| **Request property removed**  | `request-property-removed` ⚠️                                                 | Request body field `name` removed                                                                      |
| **Parameter removed**         | `request-parameter-removed` ⚠️                                                | Query param `filter` removed from `GET /api/agents`                                                    |
| **Response property removed** | `response-required-property-removed`, `response-optional-property-removed` ⚠️ | Response field `id` removed from `200` response                                                        |
| **Required property added**   | `new-required-request-property`                                               | New required `email` field on request body                                                             |
| **Optional made required**    | `request-parameter-became-required`                                           | `filter` query param becomes required                                                                  |
| **Type changed**              | `response-property-type-changed`                                              | `id` changed from string to number                                                                     |
| **Request body tightened**    | `kbn:request-additional-properties-tightened`                                 | Request body schema gains `additionalProperties: false` (clients sending unknown keys now receive 400) |

⚠️ oasdiff classifies these as warnings, but they are treated as breaking here because clients depend on these fields: removing a request field, request parameter, or optional response property breaks any consumer that sends or reads it.

## Allowlist

For approved breaking changes, add entries to `allowlist.json`. **Always prefer the granular form below** — it scopes suppression to one specific breaking change instead of muting everything on the endpoint.

### Granular form (recommended)

Use `oasdiffId` together with `source` to suppress exactly one breaking change. These fields are AND'd with `path` and `method`: the entry only matches changes for which all four fields agree.

- `oasdiffId` — matches the oasdiff rule ID (e.g. `request-property-removed`, `kbn:request-additional-properties-tightened`). See the [Breaking Change Rules](#breaking-change-rules) table for known IDs.
- `source` — matches the JSON pointer / source location reported by oasdiff (e.g. `/components/schemas/Output/properties/name`).

```json
{
  "path": "/api/fleet/outputs",
  "method": "post",
  "reason": "Approved removal of deprecated 'name' field from request body",
  "approvedBy": "@elastic/fleet",
  "oasdiffId": "request-property-removed",
  "source": "/components/schemas/Output/properties/name"
}
```

Example targeting the new request-body tightening rule:

```json
{
  "path": "/api/data_views/data_view",
  "method": "post",
  "reason": "Intentional tightening — approved by the owning team",
  "approvedBy": "@elastic/kibana-data-discovery",
  "oasdiffId": "kbn:request-additional-properties-tightened",
  "source": "/components/schemas/Data_views_create_data_view_request_object"
}
```

**Required fields:** `path`, `method`, `reason`, `approvedBy`, `oasdiffId`, `source` (the last two only required for granular suppression).
**Optional fields:** `prUrl`, `expiresAt`.

### Coarse form (⚠️ avoid unless absolutely necessary — this masks all future breaking changes on the endpoint)

Omitting `oasdiffId` and `source` makes the entry suppress **every** breaking change for that `(path, method)`. This is dangerous: a coarse entry approved today silently swallows any unrelated tightening, removal, or type change that lands on the same endpoint in the future. Reach for it only when several distinct, approved changes ship together and a single granular entry per change is impractical.

```json
{
  "entries": [
    {
      "path": "/api/saved_objects/{type}/{id}",
      "method": "delete",
      "reason": "Intentional removal as part of saved objects migration",
      "approvedBy": "elastic/kibana-core",
      "prUrl": "https://github.com/elastic/kibana/pull/12345",
      "expiresAt": "2026-12-31"
    }
  ]
}
```

## Stability tiers

The tier of a breaking change is resolved from the affected operation's `x-state` in the **base** spec (the API as it existed before the change), defaulting to `stable` when no `x-state` is declared — the most conservative choice, since an unknown state can only resolve up to `stable` and never silently into experimental.

- **stable** / **tech_preview** — gate the check. A breaking change here fails the check.
- **experimental** — reported for visibility only. Experimental APIs are allowed to introduce breaking changes, so these never fail the check.

### CI notifications

CI posts (or updates) a PR comment whenever there is anything to report, **regardless of whether the check fails** (the check can exit 0 with nothing gating, e.g. when every gating break is allowlisted or only experimental changes were found). The comment groups changes by stability tier, with experimental changes in a clearly labeled **non-blocking** section. When there is nothing to report, no comment is posted.

## Usage

### CI (automatic)

Runs via `.buildkite/scripts/steps/checks/api_contracts.sh` on every PR. Compares against `$BUILDKITE_PULL_REQUEST_BASE_BRANCH` (defaults to `main`).

### Local development

```bash
# Check stack contracts against main
node scripts/check_api_contracts.js \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml

# Check serverless contracts against a specific commit
node scripts/check_api_contracts.js \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml \
  --mergeBase <commit-sha>
```

**Flags:**

- `--distribution` (required) - `stack` or `serverless`
- `--specPath` - Path to current OAS file (auto-detected from distribution)
- `--baseBranch` - Branch to compare against (default: `main`)
- `--mergeBase` - Merge base commit SHA (used in CI, skips remote resolution)
- `--allowlistPath` - Override allowlist path
- `--reportPath` - Write a JSON impact report to this path (used by CI for PR notifications)

The check always diffs the full public OAS surface and gates on stable/tech_preview breaking changes. There are no per-tier enforcement flags: the soft-vs-hard merge gate is Buildkite `soft_fail` on the API Contracts step, and the per-change escape hatch is the [allowlist](#allowlist).

**Prerequisites:** oasdiff must be installed and available in PATH (or set `OASDIFF_BIN`):

```bash
brew install oasdiff
# or: curl -fsSL https://raw.githubusercontent.com/oasdiff/oasdiff/main/install.sh | sh
```

## Handling CI Notifications

When the check detects changes, CI posts a PR comment listing the affected endpoints grouped by stability tier.

1. **Review the report** - identifies which endpoints, what changed, and their stability tier
2. **If unintentional:** fix the code to maintain compatibility.
3. **If intentional:** add an allowlist entry with team approval (see [Allowlist](#allowlist)), coordinating with the owning team.

**Important:** Adding an allowlist entry does not absolve API owners from going through the Breaking Changes committee. Every stable and Technical Preview API has to follow the formal breaking change process for approval.

## Troubleshooting

### "No base OAS found - skipping check"

The base branch OAS file isn't available. This happens on:

- First PR to a new branch before `oas_docs/output/` is committed
- Shallow clones missing the base ref

The script auto-detects the `elastic/kibana` remote (falls back to `origin`) and tries `git fetch {remote} {branch} --depth=1` as a fallback. If `--mergeBase` is provided, remote resolution is skipped entirely.

### oasdiff not found

Install oasdiff locally or set `OASDIFF_BIN` to the binary path. In CI, oasdiff is pre-installed on the agent image.

### Type errors or module resolution failures

```bash
yarn kbn bootstrap
yarn test:type_check --project packages/kbn-api-contracts/tsconfig.json
```

## Testing

```bash
# Unit tests
yarn test:jest packages/kbn-api-contracts

# Type check
yarn test:type_check --project packages/kbn-api-contracts/tsconfig.json
```
